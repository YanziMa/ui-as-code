/**
 * Pills Utilities: Pill/tab-style toggle groups, segmented controls,
 * filter pills, toggle buttons, and pill-based selection components.
 */

// --- Types ---

export type PillVariant = "default" | "primary" | "success" | "warning" | "error" | "neutral";
export type PillSize = "sm" | "md" | "lg";
export type PillMode = "single" | "multiple" | "toggle";

export interface PillItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon HTML prefix */
  icon?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Custom data */
  data?: unknown;
}

export interface PillsOptions {
  /** Pill items */
  items: PillItem[];
  /** Selection mode */
  mode?: PillMode;
  /** Initially selected IDs */
  selectedIds?: string[];
  /** Color variant */
  variant?: PillVariant;
  /** Size variant */
  size?: PillSize;
  /** Shape: full rounded or slightly rounded */
  shape?: "full" | "rounded";
  /** Allow deselecting in single mode */
  allowDeselect?: boolean;
  /** Container element */
  container?: HTMLElement;
  /** Called when selection changes */
  onChange?: (selectedIds: string[], selectedItems: PillItem[]) => void;
  /** Called when a single pill is clicked */
  onItemClick?: (item: PillItem, selected: boolean, el: HTMLElement) => void;
  /** Custom class name */
  className?: string;
}

export interface PillsInstance {
  /** Root element */
  el: HTMLElement;
  /** Get selected IDs */
  getSelectedIds: () => string[];
  /** Get selected items */
  getSelectedItems: () => PillItem[];
  /** Select a pill by ID */
  select: (id: string) => void;
  /** Deselect a pill by ID */
  deselect: (id: string) => void;
  /** Toggle a pill by ID */
  toggle: (id: string) => void;
  /** Select all */
  selectAll: () => void;
  /** Deselect all */
  deselectAll: () => void;
  /** Check if a pill is selected */
  isSelected: (id: string) => boolean;
  /** Enable a pill */
  enable: (id: string) => void;
  /** Disable a pill */
  disable: (id: string) => void;
  /** Update items dynamically */
  setItems: (items: PillItem[]) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Color Map ---

const PILL_COLORS: Record<PillVariant, {
  defaultBg: string; defaultBorder: string; defaultText: string;
  selectedBg: string; selectedText: string; hoverBg: string;
}> = {
  default: {
    defaultBg: "#fff", defaultBorder: "#d1d5db", defaultText: "#374151",
    selectedBg: "#f3f4f6", selectedText: "#111827", hoverBg: "#f9fafb",
  },
  primary: {
    defaultBg: "#fff", defaultBorder: "#bfdbfe", defaultText: "#2563eb",
    selectedBg: "#3b82f6", selectedText: "#fff", hoverBg: "#eff6ff",
  },
  success: {
    defaultBg: "#fff", defaultBorder: "#a7f3d0", defaultText: "#059669",
    selectedBg: "#22c55e", selectedText: "#fff", hoverBg: "#ecfdf5",
  },
  warning: {
    defaultBg: "#fff", defaultBorder: "#fcd34d", defaultText: "#b45309",
    selectedBg: "#f59e0b", selectedText: "#fff", hoverBg: "#fffbeb",
  },
  error: {
    defaultBg: "#fff", defaultBorder: "#fca5a5", defaultText: "#dc2626",
    selectedBg: "#ef4444", selectedText: "#fff", hoverBg: "#fef2f2",
  },
  neutral: {
    defaultBg: "#fff", defaultBorder: "#e4e4e7", defaultText: "#525252",
    selectedBg: "#374151", selectedText: "#fff", hoverBg: "#f5f5f5",
  },
};

const PILL_SIZES: Record<PillSize, { padding: string; fontSize: string; height: string; iconSize: string; gap: string }> = {
  sm: { padding: "3px 10px", fontSize: "11px", height: "26px", iconSize: "13px", gap: "3px" },
  md: { padding: "5px 14px", fontSize: "12px", height: "32px", iconSize: "15px", gap: "4px" },
  lg: { padding: "7px 18px", fontSize: "14px", height: "40px", iconSize: "17px", gap: "5px" },
};

// --- Core Factory ---

/**
 * Create a pill/toggle group component.
 *
 * @example
 * ```ts
 * const pills = createPills({
 *   mode: "single",
 *   items: [
 *     { id: "day", label: "Day" },
 *     { id: "week", label: "Week" },
 *     { id: "month", label: "Month" },
 *   ],
 *   onChange: (ids) => console.log("Selected:", ids),
 * });
 * ```
 */
export function createPills(options: PillsOptions): PillsInstance {
  const {
    items,
    mode = "single",
    selectedIds: initialSelected = [],
    variant = "default",
    size = "md",
    shape = "full",
    allowDeselect = false,
    container,
    onChange,
    onItemClick,
    className,
  } = options;

  let _items = [...items];
  let _selected = new Set<string>(initialSelected);

  const vc = PILL_COLORS[variant];
  const ss = PILL_SIZES[size];

  // Root
  const root = document.createElement("div");
  root.className = `pills ${mode} ${variant} ${size} ${shape} ${className ?? ""}`.trim();
  root.setAttribute("role", mode === "toggle" ? "group" : "listbox");
  root.setAttribute("aria-multiselectable", String(mode === "multiple"));
  root.style.cssText =
    `display:inline-flex;align-items:center;gap:4px;padding:4px;` +
    `background:${shape === "rounded" ? "#f3f4f6" : "transparent"};` +
    `border-radius:${shape === "rounded" ? "10px" : "9999px"};` +
    "flex-wrap:wrap;";

  function _render(): void {
    root.innerHTML = "";

    _items.forEach((item) => {
      const isSelected = _selected.has(item.id);
      const isDisabled = item.disabled ?? false;

      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = `pill-item ${isSelected ? "selected" : ""}`;
      pill.setAttribute("role", mode === "toggle" ? "switch" : "option");
      pill.setAttribute("aria-checked", String(isSelected));
      pill.dataset.pillId = item.id;
      if (isDisabled) pill.disabled = true;

      pill.style.cssText =
        `display:inline-flex;align-items:center;gap:${ss.gap};` +
        `padding:${ss.padding};height:${ss.height};font-size:${ss.fontSize};` +
        "font-weight:500;line-height:1;white-space:nowrap;cursor:pointer;" +
        "border:none;outline:none;transition:all 0.15s ease;user-select:none;" +
        `border-radius:${shape === "full" ? "9999px" : "8px"};` +
        (isSelected
          ? `background:${vc.selectedBg};color:${vc.selectedText};` +
            (mode === "single" || mode === "multiple"
              ? `box-shadow:0 1px 3px rgba(0,0,0,0.08);`
              : "")
          : `background:${vc.defaultBg};color:${vc.defaultText};` +
            (shape === "rounded" ? "" : `border:1px solid ${vc.defaultBorder};`) +
            (isDisabled ? "opacity:0.45;cursor:not-allowed;" : ""));

      // Icon
      if (item.icon) {
        const iconEl = document.createElement("span");
        iconEl.innerHTML = item.icon;
        iconEl.style.cssText =
          `display:inline-flex;align-items:center;font-size:${ss.iconSize};line-height:1;flex-shrink:0;`;
        pill.appendChild(iconEl);
      }

      // Label
      const labelEl = document.createElement("span");
      labelEl.textContent = item.label;
      pill.appendChild(labelEl);

      // Toggle checkmark for toggle mode
      if (mode === "toggle" && isSelected) {
        const check = document.createElement("span");
        check.innerHTML = "&#10003;";
        check.style.cssText =
          "margin-left:2px;font-size:11px;font-weight:700;";
        pill.appendChild(check);
      }

      // Event handlers
      if (!isDisabled) {
        pill.addEventListener("click", () => {
          _handleClick(item.id);
          onItemClick?.(item, _selected.has(item.id), pill);
        });

        pill.addEventListener("mouseenter", () => {
          if (!_selected.has(item.id)) {
            pill.style.background = vc.hoverBg;
          }
        });
        pill.addEventListener("mouseleave", () => {
          if (!_selected.has(item.id)) {
            pill.style.background = vc.defaultBg;
          }
        });
      }

      root.appendChild(pill);
    });
  }

  function _handleClick(id: string): void {
    const item = _items.find((i) => i.id === id);
    if (!item || item.disabled) return;

    switch (mode) {
      case "single":
        if (_selected.has(id) && allowDeselect) {
          _selected.clear();
        } else {
          _selected.clear();
          _selected.add(id);
        }
        break;

      case "multiple":
        if (_selected.has(id)) {
          _selected.delete(id);
        } else {
          _selected.add(id);
        }
        break;

      case "toggle":
        if (_selected.has(id)) {
          _selected.delete(id);
        } else {
          _selected.add(id);
        }
        break;
    }

    _render();
    onChange?.(getSelectedIds(), getSelectedItems());
  }

  function getSelectedIds(): string[] { return [..._selected]; }
  function getSelectedItems(): PillItem[] { return _items.filter((i) => _selected.has(i.id)); }
  function isSelected(id: string): boolean { return _selected.has(id); }

  function select(id: string): void {
    if (mode === "single") _selected.clear();
    _selected.add(id);
    _render();
    onChange?.(getSelectedIds(), getSelectedItems());
  }

  function deselect(id: string): void {
    _selected.delete(id);
    _render();
    onChange?.(getSelectedIds(), getSelectedItems());
  }

  function toggle(id: string): void { _handleClick(id); }

  function selectAll(): void {
    if (mode === "single") return;
    for (const item of _items) {
      if (!item.disabled) _selected.add(item.id);
    }
    _render();
    onChange?.(getSelectedIds(), getSelectedItems());
  }

  function deselectAll(): void {
    _selected.clear();
    _render();
    onChange?.(getSelectedIds(), getSelectedItems());
  }

  function enable(id: string): void {
    const item = _items.find((i) => i.id === id);
    if (item) item.disabled = false;
    _render();
  }

  function disable(id: string): void {
    const item = _items.find((i) => i.id === id);
    if (item) item.disabled = true;
    _render();
  }

  function setItems(newItems: PillItem[]): void {
    _items = newItems;
    // Clean up selected set for removed items
    for (const id of _selected) {
      if (!_items.some((i) => i.id === id)) _selected.delete(id);
    }
    _render();
  }

  function destroy(): void { root.remove(); }

  _render();

  (container ?? document.body).appendChild(root);

  return {
    el: root,
    getSelectedIds,
    getSelectedItems,
    select,
    deselect,
    toggle,
    selectAll,
    deselectAll,
    isSelected,
    enable,
    disable,
    setItems,
    destroy,
  };
}
