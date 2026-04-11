/**
 * Chips Input: Tag/chip input field with autocomplete suggestions,
 * removable chips, duplicate detection, max chip limit, paste support,
 * custom chip rendering, validation, and keyboard navigation.
 */

// --- Types ---

export interface ChipData {
  /** Display text */
  label: string;
  /** Unique value */
  value: string;
  /** Optional avatar/image URL */
  avatar?: string;
  /** Color variant */
  color?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Custom data */
  data?: unknown;
}

export interface ChipsInputOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Placeholder text */
  placeholder?: string;
  /** Initial chips */
  initialChips?: ChipData[];
  /** Maximum number of chips (0 = unlimited) */
  maxChips?: number;
  /** Allow duplicates? */
  allowDuplicates?: boolean;
  /** Chip separator keys (default: Enter, comma) */
  separators?: string[];
  /** Autocomplete suggestion source */
  suggestions?: string[] | ((query: string) => Promise<string[]>);
  /** Show suggestions dropdown? */
  showSuggestions?: boolean;
  /** Max suggestions shown */
  maxSuggestions?: number;
  /** Debounce for async suggestions (ms) */
  debounceMs?: number;
  /** Custom chip renderer */
  renderChip?: (chip: ChipData, removeFn: () => void) => HTMLElement;
  /** Callback when chips change */
  onChange?: (chips: ChipData[]) => void;
  /** Callback on chip add (return false to reject) */
  onAdd?: (chip: ChipData) => boolean | void;
  /** Callback on chip remove */
  onRemove?: (chip: ChipData) => void;
  /** Callback on input focus */
  onFocus?: () => void;
  /** Callback on input blur */
  onBlur?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only mode */
  readOnly?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface ChipsInputInstance {
  element: HTMLElement;
  /** Get all chips */
  getChips: () => ChipData[];
  /** Add a chip programmatically */
  addChip: (chip: ChipData) => boolean;
  /** Remove a chip by value */
  removeChip: (value: string) => void;
  /** Clear all chips */
  clear: () => void;
  /** Set chips (replace all) */
  setChips: (chips: ChipData[]) => void;
  /** Focus the input */
  focus: () => void;
  /** Blur the input */
  blur: () => void;
  /** Destroy instance */
  destroy: () => void;
}

// --- Main Factory ---

export function createChipsInput(options: ChipsInputOptions): ChipsInputInstance {
  const opts = {
    placeholder: options.placeholder ?? "Type and press Enter...",
    maxChips: options.maxChips ?? 0,
    allowDuplicates: options.allowDuplicates ?? false,
    separators: options.separators ?? ["Enter", ","],
    showSuggestions: options.showSuggestions ?? true,
    maxSuggestions: options.maxSuggestions ?? 8,
    debounceMs: options.debounceMs ?? 200,
    disabled: options.disabled ?? false,
    readOnly: options.readOnly ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ChipsInput: container not found");

  let chips: ChipData[] = options.initialChips ? [...options.initialChips] : [];
  let destroyed = false;

  // Root wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `chips-input ${opts.className}`;
  wrapper.style.cssText = `
    display:flex;flex-wrap:wrap;align-items:center;gap:6px;
    padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;
    background:#fff;font-family:-apple-system,sans-serif;font-size:14px;
    min-height:42px;cursor:text;
    transition:border-color 0.15s, box-shadow 0.15s;
    ${opts.disabled ? "opacity:0.5;cursor:not-allowed;" : ""}
    ${opts.readOnly ? "background:#f9fafb;" : ""}
  `;
  wrapper.setAttribute("role", "combobox");
  wrapper.setAttribute("aria-expanded", "false");

  // Chips area
  const chipsArea = document.createElement("div");
  chipsArea.className = "chips-area";
  chipsArea.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;align-items:center;flex:1;";
  wrapper.appendChild(chipsArea);

  // Text input
  const input = document.createElement("input");
  input.type = "text";
  input.className = "chips-input-field";
  input.placeholder = chips.length === 0 ? opts.placeholder : "";
  input.style.cssText = `
    border:none;outline:none;background:transparent;
    font-size:14px;font-family:inherit;color:#111827;
    min-width:120px;flex:1;min-height:28px;padding:0;
  `;
  if (opts.disabled) input.disabled = true;
  if (opts.readOnly) input.readOnly = true;
  chipsArea.appendChild(input);

  // Suggestions dropdown
  let suggestionDropdown: HTMLElement | null = null;

  function createSuggestionDropdown(): HTMLElement {
    const dd = document.createElement("div");
    dd.className = "chips-suggestions";
    dd.style.cssText = `
      position:absolute;display:none;background:#fff;border:1px solid #e5e7eb;
      border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,0.1);
      margin-top:4px;max-height:200px;overflow-y:auto;z-index:1000;
      min-width:200px;font-size:13px;
    `;
    return dd;
  }

  // --- Render Chips ---

  function renderChips(): void {
    // Remove existing chip elements (keep input)
    const existingChips = chipsArea.querySelectorAll(".chip-item");
    existingChips.forEach((c) => c.remove());

    for (const chip of chips) {
      const chipEl = opts.renderChip
        ? opts.renderChip(chip, () => removeChipByValue(chip.value))
        : renderDefaultChip(chip);
      chipsArea.insertBefore(chipEl, input);
    }

    input.placeholder = chips.length === 0 ? opts.placeholder : "";
    opts.onChange?.([...chips]);
  }

  function renderDefaultChip(chip: ChipData): HTMLElement {
    const el = document.createElement("span");
    el.className = "chip-item";
    el.style.cssText = `
      display:inline-flex;align-items:center;gap:4px;
      padding:3px 8px;border-radius:999px;
      background:${chip.color ?? "#eef2ff"};color:${chip.color ? "#fff" : "#4338ca"};
      font-size:12px;font-weight:500;line-height:1.5;
      max-width:180px;transition:opacity 0.15s;
      ${chip.disabled ? "opacity:0.5;" : ""}
    `;

    // Avatar
    if (chip.avatar) {
      const img = document.createElement("img");
      img.src = chip.avatar;
      img.alt = "";
      img.style.cssText = "width:16px;height:16px;border-radius:50%;object-fit:cover;";
      el.appendChild(img);
    }

    // Label
    const label = document.createElement("span");
    label.style.cssText = "max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    label.textContent = chip.label;
    el.appendChild(label);

    // Remove button
    if (!chip.disabled && !opts.readOnly && !opts.disabled) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = "&times;";
      btn.setAttribute("aria-label", `Remove ${chip.label}`);
      btn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:14px;
        line-height:1;color:inherit;opacity:0.6;padding:0;margin-left:-2px;
        transition:opacity 0.15s;
      `;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeChipByValue(chip.value);
      });
      btn.addEventListener("mouseenter", () => { btn.style.opacity = "1"; });
      btn.addEventListener("mouseleave", () => { btn.style.opacity = "0.6"; });
      el.appendChild(btn);
    }

    return el;
  }

  // --- Chip Management ---

  function addChip(chip: ChipData): boolean {
    if (destroyed || opts.disabled || opts.readOnly) return false;
    if (opts.maxChips > 0 && chips.length >= opts.maxChips) return false;
    if (!opts.allowDuplicates && chips.some((c) => c.value === chip.value)) return false;

    const rejected = opts.onAdd?.(chip);
    if (rejected === false) return false;

    chips.push(chip);
    renderChips();
    hideSuggestions();
    return true;
  }

  function removeChipByValue(value: string): void {
    const idx = chips.findIndex((c) => c.value === value);
    if (idx >= 0) {
      const [removed] = chips.splice(idx, 1);
      opts.onRemove?.(removed);
      renderChips();
    }
  }

  // --- Suggestions ---

  let suggestionTimer: ReturnType<typeof setTimeout> | null = null;

  async function showSuggestions(query: string): Promise<void {
    if (!opts.showSuggestions || !opts.suggestions || query.length === 0) {
      hideSuggestions();
      return;
    }

    if (!suggestionDropdown) {
      suggestionDropdown = createSuggestionDropdown();
      wrapper.style.position = "relative";
      wrapper.appendChild(suggestionDropdown);
    }

    let results: string[] = [];

    if (Array.isArray(opts.suggestions)) {
      results = opts.suggestions.filter((s) =>
        s.toLowerCase().includes(query.toLowerCase())
      ).slice(0, opts.maxSuggestions);
    } else {
      try {
        results = (await opts.suggestions(query)).slice(0, opts.maxSuggestions);
      } catch {
        results = [];
      }
    }

    if (results.length === 0) {
      hideSuggestions();
      return;
    }

    suggestionDropdown.innerHTML = "";
    for (const result of results) {
      const item = document.createElement("div");
      item.style.cssText = `
        padding:8px 12px;cursor:pointer;font-size:13px;color:#374151;
        transition:background 0.1s;
      `;
      item.textContent = result;
      item.addEventListener("mouseenter", () => { item.style.background = "#f3f4f6"; });
      item.addEventListener("mouseleave", () => { item.style.background = ""; });
      item.addEventListener("click", () => {
        addChip({ label: result, value: result });
        input.value = "";
        hideSuggestions();
        input.focus();
      });
      suggestionDropdown.appendChild(item);
    }

    suggestionDropdown.style.display = "block";
    wrapper.setAttribute("aria-expanded", "true");
  }

  function hideSuggestions(): void {
    if (suggestionDropdown) {
      suggestionDropdown.style.display = "none";
      suggestionDropdown.innerHTML = "";
    }
    wrapper.setAttribute("aria-expanded", "false");
  }

  // --- Event Handlers ---

  function handleKeyDown(e: KeyboardEvent): void {
    if (opts.disabled || opts.readOnly) return;

    if (opts.separators.includes(e.key)) {
      e.preventDefault();
      const value = input.value.trim();
      if (value) {
        addChip({ label: value, value });
        input.value = "";
      }
    } else if (e.key === "Backspace" && input.value === "" && chips.length > 0) {
      // Remove last chip
      removeChipByValue(chips[chips.length - 1]!.value);
    }
  }

  function handleInput(): void {
    const query = input.value.trim();

    if (suggestionTimer) clearTimeout(suggestionTimer);
    suggestionTimer = setTimeout(() => showSuggestions(query), opts.debounceMs);
  }

  input.addEventListener("keydown", handleKeyDown);
  input.addEventListener("input", handleInput);
  input.addEventListener("focus", () => { opts.onFocus?.(); });
  input.addEventListener("blur", () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      hideSuggestions();
      opts.onBlur?.();
    }, 150);
  });

  // Click on wrapper focuses input
  wrapper.addEventListener("click", () => {
    if (!opts.disabled && !opts.readOnly) input.focus();
  });

  // Paste handler
  wrapper.addEventListener("paste", (e: ClipboardEvent) => {
    if (opts.disabled || opts.readOnly) return;
    e.preventDefault();
    const text = e.clipboardData?.getData("text") ?? "";
    const items = text.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    for (const item of items) {
      if (!addChip({ label: item, value: item })) break;
    }
  });

  container.appendChild(wrapper);

  // Initial render
  renderChips();

  const instance: ChipsInputInstance = {
    element: wrapper,

    getChips() { return [...chips]; },

    addChip,

    removeChip(value: string) { removeChipByValue(value); },

    clear() {
      chips = [];
      renderChips();
    },

    setChips(newChips: ChipData[]) {
      chips = [...newChips];
      renderChips();
    },

    focus() { input.focus(); },
    blur() { input.blur(); },

    destroy() {
      destroyed = true;
      if (suggestionTimer) clearTimeout(suggestionTimer);
      wrapper.remove();
    },
  };

  return instance;
}
