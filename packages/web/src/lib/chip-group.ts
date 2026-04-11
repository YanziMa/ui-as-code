/**
 * Chip Group: Multi-select / single-select chip/tag group with filtering,
 * add/remove animations, keyboard navigation, disabled states,
 * closable chips, avatar support, and customizable rendering.
 */

// --- Types ---

export type ChipSize = "sm" | "md" | "lg";
export type ChipVariant = "filled" | "outlined" | "tonal";
export type ChipSelectionMode = "none" | "single" | "multiple";

export interface ChipItem {
  /** Unique key */
  key: string;
  /** Display label */
  label: string;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Avatar image URL (shows small circle image instead of icon) */
  avatar?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Removable via × button */
  closable?: boolean;
  /** Selected state (controlled or uncontrolled) */
  selected?: boolean;
  /** Custom data */
  data?: unknown;
  /** Tooltip text */
  tooltip?: string;
  /** Custom CSS class */
  className?: string;
}

export interface ChipGroupOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Chip items */
  items: ChipItem[];
  /** Selection mode */
  selectionMode?: ChipSelectionMode;
  /** Size variant */
  size?: ChipSize;
  /** Visual variant */
  variant?: ChipVariant;
  /** Allow adding new chips via input */
  allowAdd?: boolean;
  /** Placeholder for add input */
  addPlaceholder?: string;
  /** Max chips allowed (0 = unlimited) */
  maxChips?: number;
  /** Wrap chips to next line or scroll horizontally */
  wrap?: boolean;
  /** Callback when selection changes */
  onSelectionChange?: (selectedKeys: string[]) => void;
  /** Callback when a chip is removed */
  onRemove?: (item: ChipItem) => void;
  /** Callback when a new chip is added */
  onAdd?: (label: string) => ChipItem | void;
  /** Callback on chip click */
  onClick?: (item: ChipItem) => void;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Custom CSS class for container */
  className?: string;
}

export interface ChipGroupInstance {
  /** Root DOM element */
  element: HTMLDivElement;
  /** Get all items */
  getItems: () => ChipItem[];
  /** Get selected keys */
  getSelectedKeys: () => string[];
  /** Select a chip by key */
  select: (key: string) => void;
  /** Deselect a chip by key */
  deselect: (key: string) => void;
  /** Select/deselect toggle */
  toggle: (key: string) => void;
  /** Add a chip */
  addItem: (item: ChipItem) => void;
  /** Remove a chip by key */
  removeItem: (key: string) => void;
  /** Update items */
  setItems: (items: ChipItem[]) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Constants ---

const SIZE_STYLES: Record<ChipSize, { padding: string; fontSize: string; height: string; gap: string; iconSize: string }> = {
  sm:   { padding: "2px 8px", fontSize: "11px", height: "22px", gap: "4px", iconSize: "12px" },
  md:   { padding: "4px 12px", fontSize: "13px", height: "28px", gap: "6px", iconSize: "14px" },
  lg:   { padding: "6px 16px", fontSize: "14px", height: "34px", gap: "8px", iconSize: "16px" },
};

const VARIANT_STYLES: Record<ChipVariant, (selected: boolean) => { bg: string; color: string; border: string }> = {
  filled: (sel) => sel
    ? { bg: "#4f46e5", color: "#fff", border: "#4f46e5" }
    : { bg: "#f3f4f6", color: "#374151", border: "transparent" },
  outlined: (sel) => sel
    ? { bg: "#eef2ff", color: "#4f46e5", border: "#4f46e5" }
    : { bg: "transparent", color: "#374151", border: "#d1d5db" },
  tonal: (sel) => sel
    ? { bg: "#c7d2fe", color: "#3730a3", border: "transparent" }
    : { bg: "#f3f4f6", color: "#374151", border: "transparent" },
};

// --- Helpers ---

function resolveEl(el: HTMLElement | string): HTMLElement | null {
  return typeof el === "string" ? document.querySelector<HTMLElement>(el) : el;
}

// --- Main Factory ---

export function createChipGroup(options: ChipGroupOptions): ChipGroupInstance {
  const opts = {
    size: options.size ?? "md",
    variant: options.variant ?? "filled",
    selectionMode: options.selectionMode ?? "none",
    allowAdd: options.allowAdd ?? false,
    maxChips: options.maxChips ?? 0,
    wrap: options.wrap ?? true,
    animationDuration: options.animationDuration ?? 150,
    ...options,
  };

  const container = resolveEl(options.container);
  if (!container) throw new Error("ChipGroup: container not found");

  const sz = SIZE_STYLES[opts.size];
  let destroyed = false;
  let currentItems: ChipItem[] = [...options.items];
  let selectedKeys = new Set<string>(
    currentItems.filter((i) => i.selected).map((i) => i.key),
  );

  // Root container
  const root = document.createElement("div");
  root.className = `chip-group ${opts.className ?? ""}`;
  root.setAttribute("role", opts.selectionMode === "multiple" ? "group" : "listbox");
  root.style.cssText = `
    display:${opts.wrap ? "flex" : "inline-flex"};flex-wrap:${opts.wrap ? "wrap" : "nowrap"};
    align-items:center;gap:6px;font-family:-apple-system,sans-serif;
    ${!opts.wrap ? "overflow-x:auto;" : ""}
  `;

  // Chips container
  const chipsContainer = document.createElement("div");
  chipsContainer.className = "chip-chips";
  chipsContainer.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;gap:6px;";
  root.appendChild(chipsContainer);

  // Add input
  let addInput: HTMLInputElement | null = null;

  if (opts.allowAdd) {
    const inputWrapper = document.createElement("div");
    inputWrapper.style.cssText = "display:inline-flex;align-items:center;";
    addInput = document.createElement("input");
    addInput.type = "text";
    addInput.placeholder = opts.addPlaceholder ?? "Add chip...";
    addInput.style.cssText = `
      border:none;outline:none;background:transparent;
      font-size:${sz.fontSize};padding:${sz.padding};height:${sz.height};
      min-width:80px;color:#374151;
    `;
    inputWrapper.appendChild(addInput);
    root.appendChild(inputWrapper);

    addInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const val = addInput!.value.trim().replace(/,$/, "");
        if (!val) return;
        if (opts.maxChips > 0 && currentItems.length >= opts.maxChips) return;

        const result = opts.onAdd?.(val);
        if (result) {
          addItem(result);
        } else if (val) {
          addItem({ key: `chip-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, label: val });
        }
        addInput!.value = "";
        addInput!.focus();
      }

      if (e.key === "Backspace" && !addInput!.value.trim()) {
        // Remove last non-disabled chip
        const lastRemovable = [...currentItems].reverse().find((i) => !i.disabled);
        if (lastRemovable) removeItem(lastRemovable.key);
      }
    });
  }

  // Build a single chip element
  function buildChip(item: ChipItem): HTMLElement {
    const isSelected = selectedKeys.has(item.key);
    const vs = VARIANT_STYLES[opts.variant](isSelected);

    const chip = document.createElement("div");
    chip.className = `chip${isSelected ? " chip-selected" : ""}${item.disabled ? " chip-disabled" : ""} ${item.className ?? ""}`;
    chip.dataset.key = item.key;
    chip.setAttribute("role", opts.selectionMode !== "none" ? "option" : "button");
    chip.tabIndex = item.disabled ? -1 : 0;
    chip.setAttribute("aria-selected", String(isSelected));
    if (item.disabled) chip.setAttribute("aria-disabled", "true");
    if (item.tooltip) chip.title = item.tooltip;

    chip.style.cssText = `
      display:inline-flex;align-items:center;gap:${sz.gap};
      padding:${sz.padding};height:${sz.height};
      font-size:${sz.fontSize};font-weight:500;line-height:1;
      background:${vs.bg};color:${vs.color};
      border:1px solid ${vs.border};border-radius:9999px;
      cursor:${item.disabled ? "not-allowed" : "pointer"};
      white-space:nowrap;user-select:none;
      transition:all ${opts.animationDuration}ms ease;
      max-width:200px;
    `;

    // Avatar or icon
    if (item.avatar) {
      const av = document.createElement("img");
      av.src = item.avatar;
      av.alt = "";
      av.style.cssText = `width:${sz.iconSize};height:${sz.iconSize};border-radius:50%;object-fit:cover;flex-shrink:0;`;
      chip.appendChild(av);
    } else if (item.icon) {
      const ic = document.createElement("span");
      ic.textContent = item.icon;
      ic.style.cssText = `font-size:${sz.iconSize};flex-shrink:0;display:inline-flex;align-items:center;`;
      chip.appendChild(ic);
    }

    // Label
    const label = document.createElement("span");
    label.className = "chip-label";
    label.textContent = item.label;
    label.style.cssText = "overflow:hidden;text-overflow:ellipsis;max-width:140px;";
    chip.appendChild(label);

    // Close button
    if (item.closable || opts.selectionMode !== "none") {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "&times;";
      closeBtn.setAttribute("aria-label", `Remove ${item.label}`);
      closeBtn.style.cssText = `
        background:none;border:none;cursor:pointer;padding:0;margin-left:-2px;
        font-size:${parseInt(sz.fontSize) + 2}px;line-height:1;color:inherit;
        opacity:0.6;display:inline-flex;align-items:center;justify-content:center;
        width:16px;height:16px;border-radius:50%;transition:background 0.1s;
      `;
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (opts.selectionMode !== "none") {
          toggle(item.key);
        } else {
          removeItem(item.key);
          opts.onRemove?.(item);
        }
      });
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "rgba(0,0,0,0.1)"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; });
      chip.appendChild(closeBtn);
    }

    // Click handler
    if (!item.disabled) {
      chip.addEventListener("click", () => {
        if (opts.selectionMode !== "none") {
          toggle(item.key);
        }
        opts.onClick?.(item);
      });

      // Hover effect
      chip.addEventListener("mouseenter", () => {
        if (!isSelected) {
          chip.style.background = opts.variant === "filled" ? "#e5e7eb"
            : opts.variant === "outlined" ? "#f9fafb" : "#e5e7eb";
        }
      });
      chip.addEventListener("mouseleave", () => {
        const nowSel = selectedKeys.has(item.key);
        const vs2 = VARIANT_STYLES[opts.variant](nowSel);
        chip.style.background = vs2.bg;
        chip.style.borderColor = vs2.border;
      });

      // Keyboard
      chip.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (opts.selectionMode !== "none") toggle(item.key);
          opts.onClick?.(item);
        }
        if ((e.key === "Delete" || e.key === "Backspace") && item.closable) {
          e.preventDefault();
          removeItem(item.key);
          opts.onRemove?.(item);
        }
      });
    }

    return chip;
  }

  function render(): void {
    chipsContainer.innerHTML = "";

    for (const item of currentItems) {
      const chip = buildChip(item);
      chipsContainer.appendChild(chip);
    }
  }

  function notifySelection(): void {
    opts.onSelectionChange?.([...selectedKeys]);
  }

  // Instance API

  function select(key: string): void {
    if (opts.selectionMode === "none") return;
    if (opts.selectionMode === "single") selectedKeys.clear();
    selectedKeys.add(key);
    render();
    notifySelection();
  }

  function deselect(key: string): void {
    selectedKeys.delete(key);
    render();
    notifySelection();
  }

  function toggle(key: string): void {
    if (selectedKeys.has(key)) {
      deselect(key);
    } else {
      select(key);
    }
  }

  function addItem(item: ChipItem): void {
    if (opts.maxChips > 0 && currentItems.length >= opts.maxChips) return;
    currentItems.push(item);
    render();
  }

  function removeItem(key: string): void {
    currentItems = currentItems.filter((i) => i.key !== key);
    selectedKeys.delete(key);
    render();
    notifySelection();
  }

  const instance: ChipGroupInstance = {
    element: root,

    getItems: () => [...currentItems],
    getSelectedKeys: () => [...selectedKeys],

    select,
    deselect,
    toggle,

    addItem,
    removeItem,

    setItems(items: ChipItem[]) {
      currentItems = items;
      selectedKeys = new Set(items.filter((i) => i.selected).map((i) => i.key));
      render();
    },

    clearSelection() {
      selectedKeys.clear();
      render();
      notifySelection();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  container.appendChild(root);
  render();

  return instance;
}
