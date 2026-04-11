/**
 * Chip Utilities: Action chips, filter chips, choice chips (radio/checkbox),
 * suggestion chips, and chip sets with keyboard navigation.
 */

// --- Types ---

export type ChipType = "action" | "filter" | "choice" | "suggestion" | "input";
export type ChipSize = "sm" | "md" | "lg";
export type ChipColor = "default" | "primary" | "success" | "warning" | "error" | "neutral";

export interface ChipConfig {
  /** Label text */
  label: string;
  /** Icon HTML string */
  icon?: string;
  /** Leading avatar URL or element */
  leadingAvatar?: string | HTMLElement;
  /** Trailing icon HTML string */
  trailingIcon?: string;
  /** Chip type */
  type?: ChipType;
  /** Color variant */
  color?: ChipColor;
  /** Size variant */
  size?: ChipSize;
  /** Selected state (for choice/filter) */
  selected?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Unique ID */
  id?: string;
  /** Click handler */
  onClick?: (chip: ChipConfig, el: HTMLElement) => void;
  /** Remove/dismiss handler (for filter chips) */
  onRemove?: (chip: ChipConfig) => void;
  /** Custom data */
  data?: unknown;
}

export interface ChipSetOptions {
  /** Chips in the set */
  chips: ChipConfig[];
  /** Choice mode: "single" (radio) or "multiple" (checkbox) or "none" (action) */
  choiceMode?: "single" | "multiple" | "none";
  /** Size for all chips */
  size?: ChipSize;
  /** Allow filtering (show dismiss icon) */
  filterable?: boolean;
  /** Wrap chips? Default true */
  wrap?: boolean;
  /** Gap between chips (px) */
  gap?: number;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when selection changes */
  onSelectionChange?: (selectedIds: string[], selectedChips: ChipConfig[]) => void;
  /** Called when a chip is removed (filter mode) */
  onChipRemove?: (chip: ChipConfig) => void;
}

export interface ChipSetInstance {
  /** The root element */
  el: HTMLElement;
  /** Get selected chip IDs */
  getSelectedIds: () => string[];
  /** Get selected chip configs */
  getSelectedChips: () => ChipConfig[];
  /** Select a chip by ID */
  selectChip: (id: string) => void;
  /** Deselect a chip by ID */
  deselectChip: (id: string) => void;
  /** Add a chip dynamically */
  addChip: (chip: ChipConfig) => void;
  /** Remove a chip by ID */
  removeChip: (id: string) => void;
  /** Update a chip's properties */
  updateChip: (id: string, props: Partial<ChipConfig>) => void;
  /** Get all chip configs */
  getChips: () => ChipConfig[];
  /** Destroy */
  destroy: () => void;
}

// --- Color Map ---

const COLOR_STYLES: Record<ChipColor, { bg: string; border: string; text: string; selectedBg: string; selectedBorder: string; selectedText: string }> = {
  "default": { bg: "#f3f4f6", border: "#e5e7eb", text: "#374151", selectedBg: "#eff6ff", selectedBorder: "#93c5fd", selectedText: "#2563eb" },
  "primary": { bg: "#fff", border: "#d1d5db", text: "#374151", selectedBg: "#3b82f6", selectedBorder: "#3b82f6", selectedText: "#fff" },
  "success": { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", selectedBg: "#22c55e", selectedBorder: "#22c55e", selectedText: "#fff" },
  "warning": { bg: "#fffbeb", border: "#fde68a", text: "#92400e", selectedBg: "#f59e0b", selectedBorder: "#f59e0b", selectedText: "#fff" },
  "error": { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", selectedBg: "#ef4444", selectedBorder: "#ef4444", selectedText: "#fff" },
  "neutral": { bg: "#f9fafb", border: "#e5e7eb", text: "#6b7280", selectedBg: "#374151", selectedBorder: "#374151", selectedText: "#fff" },
};

const SIZE_STYLES: Record<ChipSize, { padding: string; fontSize: string; iconSize: string; height: string }> = {
  "sm": { padding: "2px 8px", fontSize: "11px", iconSize: "12px", height: "22px" },
  "md": { padding: "4px 12px", fontSize: "12px", iconSize: "14px", height: "28px" },
  "lg": { padding: "6px 16px", fontSize: "13px", iconSize: "16px", height: "34px" },
};

// --- Single Chip Factory ---

/**
 * Create a single chip element.
 *
 * @example
 * ```ts
 * const chip = createChip({ label: "React", type: "filter", onRemove: () => {} });
 * container.appendChild(chip);
 * ```
 */
export function createChip(config: ChipConfig): HTMLElement {
  const {
    label,
    icon,
    leadingAvatar,
    trailingIcon,
    type = "action",
    color = "default",
    size = "md",
    selected = false,
    disabled = false,
    onClick,
    onRemove,
  } = config;

  const cs = COLOR_STYLES[color];
  const ss = SIZE_STYLES[size];
  const isSelected = selected;

  const el = document.createElement("button");
  el.type = "button";
  el.className = `chip chip-${type} chip-${color} chip-${size}${isSelected ? " selected" : ""}${disabled ? " disabled" : ""}`;
  if (config.id) el.dataset.chipId = config.id;

  // Base styles
  Object.assign(el.style, {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: ss.padding,
    fontSize: ss.fontSize,
    fontWeight: "500",
    lineHeight: "1",
    height: ss.height,
    borderRadius: "9999px",
    border: "1px solid",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    userSelect: "none",
    transition: "all 0.15s ease",
    outline: "none",
    fontFamily: "inherit",
    ...(disabled ? { opacity: "0.5", pointerEvents: "none" } : {}),
    ...(isSelected ? {
      background: cs.selectedBg,
      borderColor: cs.selectedBorder,
      color: cs.selectedText,
    } : {
      background: cs.bg,
      borderColor: cs.border,
      color: cs.text,
    }),
  });

  // Hover effect
  if (!disabled && type !== "choice") {
    el.addEventListener("mouseenter", () => {
      if (!el.classList.contains("selected")) {
        el.style.background = "#f9fafb";
        el.style.borderColor = "#d1d5db";
      }
    });
    el.addEventListener("mouseleave", () => {
      if (!el.classList.contains("selected")) {
        el.style.background = cs.bg;
        el.style.borderColor = cs.border;
      }
    });
  }

  // Leading avatar
  if (leadingAvatar) {
    const avatarEl = typeof leadingAvatar === "string"
      ? (() => { const img = document.createElement("img"); img.src = leadingAvatar; img.style.cssText = `width:${ss.iconSize};height:${ss.iconSize};border-radius:50%;object-fit:cover;flex-shrink:0;`; return img; })()
      : leadingAvatar as HTMLElement;
    avatarEl.style.flexShrink = "0";
    el.appendChild(avatarEl);
  }

  // Icon
  if (icon) {
    const iconSpan = document.createElement("span");
    iconSpan.innerHTML = icon;
    iconSpan.style.cssText = `display:inline-flex;align-items:center;font-size:${ss.iconSize};flex-shrink:0;line-height:1;`;
    el.appendChild(iconSpan);
  }

  // Label
  const labelSpan = document.createElement("span");
  labelSpan.textContent = label;
  labelSpan.style.overflow = "hidden";
  labelSpan.style.textOverflow = "ellipsis";
  el.appendChild(labelSpan);

  // Trailing icon (or dismiss for filter)
  if (type === "filter" || trailingIcon) {
    const trail = document.createElement("span");
    trail.innerHTML = trailingIcon || "&times;";
    trail.style.cssText =
      `display:inline-flex;align-items:center;font-size:${ss.fontSize};` +
      "margin-left:2px;color:currentColor;opacity:0.6;" +
      "line-height:1;";
    el.appendChild(trail);

    if (type === "filter") {
      trail.style.cursor = "pointer";
      trail.style.borderRadius = "50%";
      trail.style.padding = "2px";
      trail.addEventListener("mouseenter", () => { trail.style.background = "rgba(0,0,0,0.08)"; });
      trail.addEventListener("mouseleave", () => { trail.style.background = ""; });
      trail.addEventListener("click", (e) => {
        e.stopPropagation();
        onRemove?.(config);
        el.remove();
      });
    }
  }

  // Click handler
  if (!disabled && onClick) {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick(config, el);
    });
  }

  return el;
}

// --- Chip Set ---

/**
 * Create a chip set (group of chips with shared selection logic).
 *
 * @example
 * ```ts
 * const chipSet = createChipSet({
 *   chips: [
 *     { id: "r1", label: "React", type: "choice" },
 *     { id: "v1", label: "Vue", type: "choice" },
 *     { id: "a1", label: "Angular", type: "choice" },
 *   ],
 *   choiceMode: "multiple",
 *   onSelectionChange: (ids) => console.log("Selected:", ids),
 * });
 * ```
 */
export function createChipSet(options: ChipSetOptions): ChipSetInstance {
  const {
    chips,
    choiceMode = "none",
    size = "md",
    filterable = false,
    wrap = true,
    gap = 6,
    className,
    container,
    onSelectionChange,
    onChipRemove,
  } = options;

  let _chips = [...chips];
  const _selected = new Set<string>(
    _chips.filter((c) => c.selected).map((c) => c.id ?? `chip_${c.label}`),
  );
  let cleanupFns: Array<() => void> = [];

  // Root
  const root = document.createElement("div");
  root.className = `chip-set ${className ?? ""}`.trim();
  root.setAttribute("role", choiceMode !== "none" ? "listbox" : "group");
  root.setAttribute("aria-multiselectable", String(choiceMode === "multiple"));
  root.style.cssText =
    `display:flex;flex-wrap:${wrap ? "wrap" : "nowrap"};gap:${gap}px;align-items:center;`;

  _render();

  if (container) container.appendChild(root);
  else document.body.appendChild(root);

  function _render(): void {
    root.innerHTML = "";

    _chips.forEach((chip) => {
      const id = chip.id ?? `chip_${chip.label}`;
      const isSelected = _selected.has(id);

      const chipType = choiceMode !== "none" ? "choice" as ChipType : (filterable ? "filter" as ChipType : (chip.type || "action") as ChipType);
      const el = createChip({
        ...chip,
        id,
        type: chipType,
        size,
        selected: isSelected,
        onClick: choiceMode !== "none" ? () => _handleClick(id) : chip.onClick,
        onRemove: filterable ? (c) => {
          _chips = _chips.filter((ch) => (ch.id ?? `chip_${ch.label}`) !== id);
          el.remove();
          onChipRemove?.(c);
        } : undefined,
      });

      root.appendChild(el);
    });
  }

  function _handleClick(id: string): void {
    if (choiceMode === "single") {
      _selected.clear();
      _selected.add(id);
    } else if (choiceMode === "multiple") {
      if (_selected.has(id)) _selected.delete(id);
      else _selected.add(id);
    }
    _render();
    onSelectionChange?.(getSelectedIds(), getSelectedChips());
  }

  function getSelectedIds(): string[] { return [..._selected]; }
  function getSelectedChips(): ChipConfig[] { return _chips.filter((c) => _selected.has(c.id ?? `chip_${c.label}`)); }
  function getChips(): ChipConfig[] { return [..._chips]; }

  function selectChip(id: string): void {
    if (choiceMode === "single") _selected.clear();
    _selected.add(id);
    _render();
    onSelectionChange?.(getSelectedIds(), getSelectedChips());
  }

  function deselectChip(id: string): void {
    _selected.delete(id);
    _render();
    onSelectionChange?.(getSelectedIds(), getSelectedChips());
  }

  function addChip(chip: ChipConfig): void {
    const id = chip.id ?? `chip_${chip.label}`;
    _chips.push({ ...chip, id });
    _render();
  }

  function removeChip(id: string): void {
    _chips = _chips.filter((c) => (c.id ?? `chip_${c.label}`) !== id);
    _selected.delete(id);
    _render();
  }

  function updateChip(id: string, props: Partial<ChipConfig>): void {
    const idx = _chips.findIndex((c) => (c.id ?? `chip_${c.label}`) === id);
    if (idx >= 0) { _chips[idx] = { ..._chips[idx]!, ...props }; _render(); }
  }

  function destroy(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
    root.remove();
  }

  return { el: root, getSelectedIds, getSelectedChips, selectChip, deselectChip, addChip, removeChip, updateChip, getChips, destroy };
}
