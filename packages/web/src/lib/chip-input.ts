/**
 * Chip / Tag Input: Text input that converts entries into removable chips/tags.
 * Supports autocomplete suggestions, validation, duplicate prevention, max chips,
 * custom chip rendering, keyboard navigation, paste support, and accessibility.
 */

// --- Types ---

export interface ChipData {
  /** Display text */
  label: string;
  /** Internal value */
  value: string;
  /** Optional color/variant */
  variant?: "default" | "primary" | "success" | "warning" | "error";
  /** Disabled? */
  disabled?: boolean;
  /** Removable? */
  removable?: boolean;
  /** Custom data payload */
  data?: unknown;
}

export interface ChipSuggestion {
  label: string;
  value: string;
  /** Description shown below suggestion */
  description?: string;
  /** Icon/emoji prefix */
  icon?: string;
}

export interface ChipInputOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Placeholder text */
  placeholder?: string;
  /** Initial chips */
  initialValue?: ChipData[];
  /** Maximum number of chips (0 = unlimited) */
  maxChips?: number;
  /** Allow duplicates? */
  allowDuplicates?: boolean;
  /** Allow custom (non-suggested) values? */
  allowCustom?: boolean;
  /** Delimiter characters for splitting pasted text */
  delimiters?: string[];
  /** Autocomplete suggestions (static or async loader) */
  suggestions?: ChipSuggestion[] | ((query: string) => Promise<ChipSuggestion[]>);
  /** Show suggestions dropdown? */
  showSuggestions?: boolean;
  /** Max suggestions to show */
  maxSuggestions?: number;
  /** Validate function — return error message or null */
  validate?: (label: string, value: string) => string | null;
  /** Callback when chips change */
  onChange?: (chips: ChipData[]) => void;
  /** Callback on chip add */
  onAdd?: (chip: ChipData) => void;
  /** Callback on chip remove */
  onRemove?: (chip: ChipData) => void;
  /** Callback on input focus */
  onFocus?: () => void;
  /** Callback on input blur */
  onBlur?: () => void;
  /** Custom CSS class */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only mode (no adding/removing) */
  readOnly?: boolean;
  /** Chip size */
  size?: "sm" | "md" | "lg";
}

export interface ChipInputInstance {
  element: HTMLElement;
  getChips: () => ChipData[];
  setChips: (chips: ChipData[]) => void;
  addChip: (label: string, value?: string) => boolean;
  removeChip: (value: string) => void;
  clearAll: () => void;
  focus: () => void;
  blur: () => void;
  destroy: () => void;
}

// --- Variant Colors ---

const CHIP_VARIANT_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  default:  { bg: "#f3f4f6", color: "#374151", border: "#e5e7eb" },
  primary:  { bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe" },
  success:  { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  warning:  { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  error:    { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" },
};

const SIZE_CONFIG: Record<string, { inputFontSize: number; chipPadding: string; chipFontSize: number; height: string }> = {
  sm: { inputFontSize: 12, chipPadding: "2px 8px", chipFontSize: 11, height: "32px" },
  md: { inputFontSize: 13, chipPadding: "4px 10px", chipFontSize: 12, height: "40px" },
  lg: { inputFontSize: 14, chipPadding: "6px 14px", chipFontSize: 13, height: "48px" },
};

// --- Main Class ---

export class ChipInputManager {
  create(options: ChipInputOptions): ChipInputInstance {
    const opts = {
      placeholder: options.placeholder ?? "Type and press Enter...",
      maxChips: options.maxChips ?? 0,
      allowDuplicates: options.allowDuplicates ?? false,
      allowCustom: options.allowCustom ?? true,
      delimiters: options.delimiters ?? [",", ";"],
      showSuggestions: options.showSuggestions ?? true,
      maxSuggestions: options.maxSuggestions ?? 8,
      disabled: options.disabled ?? false,
      readOnly: options.readOnly ?? false,
      size: options.size ?? "md",
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("ChipInput: container not found");

    const sz = SIZE_CONFIG[opts.size];

    container.className = `chip-input ${opts.className}`;
    container.style.cssText = `
      display:flex;align-items:center;flex-wrap:wrap;gap:6px;
      border:1px solid #d1d5db;border-radius:8px;padding:6px 10px;
      background:#fff;min-height:${sz.height};cursor:text;
      font-family:-apple-system,sans-serif;position:relative;
      transition:border-color 0.15s,box-shadow 0.15s;
      ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
      ${opts.readOnly ? "background:#f9fafb;" : ""}
    `;

    // Chips area
    const chipsArea = document.createElement("div");
    chipsArea.className = "ci-chips";
    chipsArea.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;flex:1;";
    container.appendChild(chipsArea);

    // Hidden text input
    const input = document.createElement("input");
    input.type = "text";
    input.className = "ci-input";
    input.placeholder = opts.chips?.length ? "" : opts.placeholder;
    input.style.cssText = `
      border:none;outline:none;background:none;font-size:${sz.inputFontSize}px;
      color:#374151;min-width:80px;flex:1;max-width:100%;
      padding:4px 0;font-family:inherit;
    `;
    if (opts.disabled || opts.readOnly) input.readOnly = true;
    container.appendChild(input);

    // Suggestions dropdown
    let dropdownEl: HTMLElement | null = null;

    // State
    let chips: ChipData[] = [...(options.initialValue ?? [])];
    let suggestionAbort: AbortController | null = null;

    // --- Render ---

    function renderChips(): void {
      chipsArea.innerHTML = "";
      for (const chip of chips) {
        chipsArea.appendChild(createChipElement(chip));
      }
      input.placeholder = chips.length > 0 ? "" : opts.placeholder;
    }

    function createChipElement(chip: ChipData): HTMLElement {
      const vs = CHIP_VARIANT_STYLES[chip.variant ?? "default"];
      const el = document.createElement("span");
      el.className = "ci-chip";
      el.dataset.value = chip.value;
      el.style.cssText = `
        display:inline-flex;align-items:center;gap:4px;
        padding:${sz.chipPadding};border-radius:9999px;
        background:${vs.bg};color:${vs.color};
        border:1px solid ${vs.border};font-size:${sz.chipFontSize}px;
        font-weight:500;max-width:200px;transition:opacity 0.15s;
        ${chip.disabled ? "opacity:0.5;" : ""}
      `;

      // Label (truncate)
      const labelEl = document.createElement("span");
      labelEl.className = "ci-chip-label";
      labelEl.textContent = chip.label;
      labelEl.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      el.appendChild(labelEl);

      // Remove button
      if ((chip.removable !== false) && !chip.disabled && !opts.readOnly) {
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.innerHTML = "&times;";
        removeBtn.setAttribute("aria-label", `Remove ${chip.label}`);
        removeBtn.style.cssText = `
          background:none;border:none;cursor:pointer;color:inherit;
          font-size:14px;line-height:1;padding:0 2px;margin-left:-2px;
          opacity:0.6;border-radius:50%;width:16px;height:16px;display:flex;
          align-items:center;justify-content:center;
        `;
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          instance.removeChip(chip.value);
        });
        removeBtn.addEventListener("mouseenter", () => { removeBtn.style.opacity = "1"; removeBtn.style.background = "rgba(0,0,0,0.08)"; });
        removeBtn.addEventListener("mouseleave", () => { removeBtn.style.opacity = "0.6"; removeBtn.style.background = ""; });
        el.appendChild(removeBtn);
      }

      return el;
    }

    // --- Suggestions ---

    function showSuggestionsDropdown(items: ChipSuggestion[]): void {
      hideSuggestionsDropdown();

      if (!opts.showSuggestions || items.length === 0) return;

      dropdownEl = document.createElement("div");
      dropdownEl.className = "ci-dropdown";
      dropdownEl.style.cssText = `
        position:absolute;top:100%;left:-1px;right:-1px;z-index:1000;
        background:#fff;border:1px solid #e5e7eb;border-radius:8px;
        box-shadow:0 8px 24px rgba(0,0,0,0.12);max-height:240px;
        overflow-y:auto;margin-top:4px;font-family:-apple-system,sans-serif;
      `;

      for (const item of items.slice(0, opts.maxSuggestions)) {
        const row = document.createElement("div");
        row.className = "ci-suggestion";
        row.dataset.value = item.value;
        row.style.cssText = `
          display:flex;align-items:center;gap:8px;padding:8px 12px;
          cursor:pointer;transition:background 0.1s;
        `;

        if (item.icon) {
          const iconSpan = document.createElement("span");
          iconSpan.textContent = item.icon;
          iconSpan.style.fontSize = "14px";
          row.appendChild(iconSpan);
        }

        const textCol = document.createElement("div");
        textCol.style.cssText = "flex:1;min-width:0;";

        const nameEl = document.createElement("div");
        nameEl.textContent = item.label;
        nameEl.style.cssText = "font-size:13px;color:#111827;font-weight:500;";
        textCol.appendChild(nameEl);

        if (item.description) {
          const descEl = document.createElement("div");
          descEl.textContent = item.description;
          descEl.style.cssText = "font-size:11px;color:#9ca3af;";
          textCol.appendChild(descEl);
        }

        row.appendChild(textCol);

        row.addEventListener("mouseenter", () => { row.style.background = "#f3f4f6"; });
        row.addEventListener("mouseleave", () => { row.style.background = ""; });
        row.addEventListener("mousedown", (e) => {
          e.preventDefault();
          selectSuggestion(item);
        });

        dropdownEl.appendChild(row);
      }

      container.appendChild(dropdownEl);
    }

    function hideSuggestionsDropdown(): void {
      if (dropdownEl) {
        dropdownEl.remove();
        dropdownEl = null;
      }
      if (suggestionAbort) {
        suggestionAbort.abort();
        suggestionAbort = null;
      }
    }

    async function loadSuggestions(query: string): Promise<void> {
      if (!opts.suggestions) return;

      if (Array.isArray(opts.suggestions)) {
        const filtered = query.trim()
          ? opts.suggestions.filter((s) =>
              s.label.toLowerCase().includes(query.toLowerCase()) ||
              s.value.toLowerCase().includes(query.toLowerCase())
            )
          : opts.suggestions;
        showSuggestionsDropdown(filtered);
        return;
      }

      // Async loader
      try {
        if (suggestionAbort) suggestionAbort.abort();
        suggestionAbort = new AbortController();
        const results = await opts.suggestions(query, { signal: suggestionAbort.signal } as any);
        if (!suggestionAbort.signal.aborted) {
          showSuggestionsDropdown(results);
        }
      } catch {
        // Aborted or error — ignore
      }
    }

    function selectSuggestion(suggestion: ChipSuggestion): void {
      input.value = "";
      hideSuggestionsDropdown();
      const added = instance.addChip(suggestion.label, suggestion.value);
      if (added) input.focus();
    }

    // --- Add / Remove ---

    function doAdd(label: string, value?: string): boolean {
      const val = value ?? label.trim();
      const lbl = label.trim();
      if (!lbl) return false;

      // Max check
      if (opts.maxChips > 0 && chips.length >= opts.maxChips) return false;

      // Duplicate check
      if (!opts.allowDuplicates && chips.some((c) => c.value === val)) return false;

      // Validate
      if (opts.validate) {
        const err = opts.validate(lbl, val);
        if (err) {
          // Could show inline error — for now just skip
          return false;
        }
      }

      const chip: ChipData = { label: lbl, value: val };
      chips.push(chip);
      renderChips();
      opts.onChange?.(chips);
      opts.onAdd?.(chip);
      return true;
    }

    // --- Event Handlers ---

    input.addEventListener("focus", () => {
      container.style.borderColor = "#6366f1";
      container.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)";
      if (input.value || opts.suggestions) loadSuggestions(input.value);
      opts.onFocus?.();
    });

    input.addEventListener("blur", () => {
      container.style.borderColor = "#d1d5db";
      container.style.boxShadow = "";
      // Delay hiding to allow click on dropdown
      setTimeout(() => hideSuggestionsDropdown(), 150);
      opts.onBlur?.();
    });

    input.addEventListener("input", () => {
      if (opts.suggestions) loadSuggestions(input.value);
    });

    input.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = input.value.trim();
        if (val) {
          // Check if there's a selected suggestion
          const selected = dropdownEl?.querySelector(".ci-suggestion:hover");
          if (selected) {
            selectSuggestion({
              label: (selected.querySelector("div") as HTMLElement)?.textContent ?? val,
              value: selected.dataset.value ?? val,
            });
          } else if (opts.allowCustom) {
            const added = doAdd(val);
            if (added) input.value = "";
          }
        }
      } else if (e.key === "Backspace" && !input.value && chips.length > 0) {
        // Remove last chip
        const last = chips[chips.length - 1];
        if (last && !last.disabled) {
          instance.removeChip(last.value);
          input.focus();
        }
      } else if (e.key === "Escape") {
        hideSuggestionsDropdown();
      } else if (e.key === "ArrowDown" && dropdownEl) {
        e.preventDefault();
        // Navigate suggestions (simple implementation)
        const items = dropdownEl.querySelectorAll(".ci-suggestion");
        const hovered = dropdownEl.querySelector(".ci-suggestion:hover");
        const idx = hovered ? Array.from(items).indexOf(hovered) : -1;
        const next = items[Math.min(idx + 1, items.length - 1)] as HTMLElement;
        if (next) next.style.background = "#f3f4f6";
        if (hovered) (hovered as HTMLElement).style.background = "";
      }
    });

    // Paste handler
    input.addEventListener("paste", (e: ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData?.getData("text") ?? "";
      const parts = new RegExp(`[${opts.delimiters.map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("")}]`).test(text)
        ? text.split(new RegExp(`[${opts.delimiters.map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("")}]`))
        : [text];
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed) doAdd(trimmed);
      }
      input.value = "";
    });

    // Container click focuses input
    container.addEventListener("click", () => {
      if (!opts.readOnly && !opts.disabled) input.focus();
    });

    // Initial render
    renderChips();

    const instance: ChipInputInstance = {
      element: container,

      getChips() { return [...chips]; },

      setChips(newChips: ChipData[]) {
        chips = [...newChips];
        renderChips();
      },

      addChip(label: string, value?: string) {
        return doAdd(label, value);
      },

      removeChip(value: string) {
        const idx = chips.findIndex((c) => c.value === value);
        if (idx >= 0) {
          const [removed] = chips.splice(idx, 1);
          renderChips();
          opts.onChange?.(chips);
          opts.onRemove?.(removed!);
        }
      },

      clearAll() {
        chips = [];
        renderChips();
        opts.onChange?.(chips);
      },

      focus() { input.focus(); },
      blur() { input.blur(); },

      destroy() {
        hideSuggestionsDropdown();
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a chip input */
export function createChipInput(options: ChipInputOptions): ChipInputInstance {
  return new ChipInputManager().create(options);
}
