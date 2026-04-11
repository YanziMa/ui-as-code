/**
 * Tag Utilities: Tag/chip components with color variants, removable tags,
 * tag input with autocomplete, tag groups, tag clouds, and tag filtering.
 */

// --- Types ---

export type TagVariant = "default" | "primary" | "success" | "warning" | "error" | "info" | "neutral";
export type TagSize = "sm" | "md" | "lg";
export type TagShape = "pill" | "rounded" | "rect";

export interface TagOptions {
  /** Tag text/label */
  label: string;
  /** Color variant */
  variant?: TagVariant;
  /** Size */
  size?: TagSize;
  /** Shape */
  shape?: TagShape;
  /** Icon prefix (HTML string) */
  icon?: string;
  /** Removable (shows X button) */
  removable?: boolean;
  /** Closable via keyboard Backspace when focused */
  closable?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Selected state */
  selected?: boolean;
  /** Click handler */
  onClick?: (tag: TagOptions, el: HTMLElement) => void;
  /** Remove handler */
  onRemove?: (tag: TagOptions) => void;
  /** Custom data payload */
  data?: unknown;
  /** Custom class name */
  className?: string;
}

export interface TagInputOptions {
  /** Placeholder text */
  placeholder?: string;
  /** Available options for autocomplete */
  options?: string[];
  /** Existing tags (pre-filled) */
  tags?: TagOptions[];
  /** Max tags allowed */
  maxTags?: number;
  /** Allow duplicate tags? */
  allowDuplicates?: boolean;
  /** Allow custom tags not in options? */
  allowCustom?: boolean;
  /** Delimiter for splitting pasted text */
  delimiter?: string | RegExp;
  /** Size variant */
  size?: TagSize;
  /** Variant for added tags */
  tagVariant?: TagVariant;
  /** Show add button? */
  showAddButton?: boolean;
  /** Container element */
  container?: HTMLElement;
  /** Called when tags change */
  onChange?: (tags: TagOptions[]) => void;
  /** Called when a tag is added */
  onTagAdd?: (tag: TagOptions) => void;
  /** Called when a tag is removed */
  onTagRemove?: (tag: TagOptions) => void;
  /** Custom class name */
  className?: string;
}

export interface TagInputInstance {
  /** Root element */
  el: HTMLElement;
  /** Get current tags */
  getTags: () => TagOptions[];
  /** Add a tag programmatically */
  addTag: (tag: TagOptions) => boolean;
  /** Remove a tag by index or label */
  removeTag: (indexOrLabel: number | string) => void;
  /** Clear all tags */
  clearTags: () => void;
  /** Focus the input */
  focus: () => void;
  /** Set options list */
  setOptions: (options: string[]) => void;
  /** Destroy */
  destroy: () => void;
}

export interface TagCloudOptions {
  /** Tags with optional weight (1-10) */
  items: Array<{ label: string; weight?: number; url?: string; onClick?: () => void }>;
  /** Min font size (px) */
  minFontSize?: number;
  /** Max font size (px) */
  maxFontSize?: number;
  /** Color scheme: "monochrome", "warm", "cool", "rainbow" */
  colorScheme?: "monochrome" | "warm" | "cool" | "rainbow";
  /** Spiral layout vs random */
  spiral?: boolean;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
}

// --- Color Maps ---

const TAG_COLORS: Record<TagVariant, { bg: string; text: string; border: string; selectedBg: string; selectedText: string }> = {
  default: { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb", selectedBg: "#e5e7eb", selectedText: "#111827" },
  primary: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe", selectedBg: "#3b82f6", selectedText: "#fff" },
  success: { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0", selectedBg: "#22c55e", selectedText: "#fff" },
  warning: { bg: "#fffbeb", text: "#d97706", border: "#fde68a", selectedBg: "#f59e0b", selectedText: "#fff" },
  error: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca", selectedBg: "#ef4444", selectedText: "#fff" },
  info: { bg: "#eff6ff", text: "#0284c7", border: "#bae6fd", selectedBg: "#0ea5e9", selectedText: "#fff" },
  neutral: { bg: "#f9fafb", text: "#6b7280", border: "#f3f4f6", selectedBg: "#374151", selectedText: "#fff" },
};

const TAG_SIZES: Record<TagSize, { padding: string; fontSize: string; height: string; iconSize: string }> = {
  sm: { padding: "1px 7px", fontSize: "11px", height: "22px", iconSize: "12px" },
  md: { padding: "3px 10px", fontSize: "12px", height: "28px", iconSize: "14px" },
  lg: { padding: "5px 14px", fontSize: "13px", height: "34px", iconSize: "16px" },
};

// --- Single Tag Factory ---

/**
 * Create a single tag element.
 *
 * @example
 * ```ts
 * const tag = createTag({
 *   label: "TypeScript",
 *   variant: "primary",
 *   removable: true,
 *   onRemove: () => console.log("removed"),
 * });
 * ```
 */
export function createTag(options: TagOptions): HTMLElement {
  const {
    label,
    variant = "default",
    size = "md",
    shape = "pill",
    icon,
    removable = false,
    disabled = false,
    selected = false,
    onClick,
    onRemove,
    className,
  } = options;

  const tc = TAG_COLORS[variant];
  const ts = TAG_SIZES[size];

  const el = document.createElement("div");
  el.className = `tag ${variant} ${size} ${shape}${selected ? " selected" : ""}${disabled ? " disabled" : ""} ${className ?? ""}`.trim();
  el.setAttribute("role", "option");
  el.setAttribute("aria-selected", String(selected));
  el.setAttribute("aria-disabled", String(disabled));

  // Base styles
  el.style.cssText =
    `display:inline-flex;align-items:center;gap:4px;height:${ts.height};` +
    `padding:${ts.padding};font-size:${ts.fontSize};font-weight:500;line-height:1;` +
    `border:1px solid ${selected ? tc.selectedBg : tc.border};` +
    `background:${selected ? tc.selectedBg : tc.bg};color:${selected ? tc.selectedText : tc.text};` +
    `border-radius:${shape === "pill" ? "9999px" : shape === "rounded" ? "8px" : "4px"};` +
    "white-space:nowrap;cursor:pointer;user-select:none;" +
    "transition:all 0.15s ease;outline:none;" +
    (disabled ? "opacity:0.5;pointer-events:none;cursor:not-allowed;" : "");

  // Hover effect
  if (!disabled) {
    el.addEventListener("mouseenter", () => {
      if (!selected) {
        el.style.borderColor = tc.border;
        el.style.background = "#f9fafb";
      }
    });
    el.addEventListener("mouseleave", () => {
      if (!selected) {
        el.style.borderColor = tc.border;
        el.style.background = tc.bg;
        el.style.color = tc.text;
      }
    });
  }

  // Icon
  if (icon) {
    const iconEl = document.createElement("span");
    iconEl.innerHTML = icon;
    iconEl.style.cssText =
      `display:inline-flex;align-items:center;font-size:${ts.iconSize};flex-shrink:0;line-height:1;`;
    el.appendChild(iconEl);
  }

  // Label
  const labelEl = document.createElement("span");
  labelEl.className = "tag-label";
  labelEl.textContent = label;
  labelEl.style.cssText = "overflow:hidden;text-overflow:ellipsis;max-width:180px;";
  el.appendChild(labelEl);

  // Remove button
  if (removable && !disabled) {
    const rmBtn = document.createElement("button");
    rmBtn.type = "button";
    rmBtn.innerHTML = "&times;";
    rmBtn.setAttribute("aria-label", `Remove ${label}`);
    rmBtn.style.cssText =
      "display:inline-flex;align-items:center;justify-content:center;" +
      "width:16px;height:16px;border:none;background:none;cursor:pointer;" +
      "font-size:14px;line-height:1;border-radius:50%;flex-shrink:0;" +
      "margin-left:-2px;padding:0;color:inherit;opacity:0.65;";

    rmBtn.addEventListener("mouseenter", () => { rmBtn.style.background = "rgba(0,0,0,0.08)"; });
    rmBtn.addEventListener("mouseleave", () => { rmBtn.style.background = ""; });
    rmBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onRemove?.(options);
      el.remove();
    });

    el.appendChild(rmBtn);
  }

  // Click handler
  if (onClick && !disabled) {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick(options, el);
    });

    // Keyboard support
    el.setAttribute("tabIndex", "0");
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick(options, el);
      }
    });
  }

  return el;
}

// --- Core Factory: Tag Input ---

/**
 * Create a tag input field with autocomplete and tag management.
 *
 * @example
 * ```ts
 * const tagInput = createTagInput({
 *   placeholder: "Add tags...",
 *   options: ["React", "Vue", "Angular", "Svelte"],
 *   allowCustom: true,
 *   onChange: (tags) => console.log(tags),
 * });
 * ```
 */
export function createTagInput(options: TagInputOptions = {}): TagInputInstance {
  const {
    placeholder = "Type and press Enter...",
    options: optList = [],
    tags: initialTags = [],
    maxTags = Infinity,
    allowDuplicates = false,
    allowCustom = true,
    delimiter = /[,;]/,
    size = "md",
    tagVariant = "default",
    showAddButton = false,
    container,
    onChange,
    onTagAdd,
    onTagRemove,
    className,
  } = options;

  let _tags: TagOptions[] = [...initialTags];
  let _options = [...optList];
  let _activeSuggestion = -1;
  let suggestionBox: HTMLElement | null = null;

  // Root
  const root = document.createElement("div");
  root.className = `tag-input ${className ?? ""}`.trim();
  root.style.cssText =
    `display:flex;flex-wrap:wrap;align-items:center;gap:4px;` +
    `padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;background:#fff;` +
    "min-height:40px;font-family:inherit;cursor:text;";

  root.addEventListener("click", () => input.focus());

  // Render existing tags
  function renderTags(): void {
    // Remove existing tag elements (keep input and add button)
    const children = Array.from(root.children);
    for (const child of children) {
      if (child.classList.contains("tag") || child.classList.contains("tag-suggestion-box")) {
        child.remove();
      }
    }

    for (let i = 0; i < _tags.length; i++) {
      const tag = _tags[i]!;
      const tagEl = createTag({
        ...tag,
        size,
        variant: tag.variant ?? tagVariant,
        removable: true,
        onRemove: (_t) => {
          _tags.splice(i, 1);
          renderTags();
          onChange?.(_tags);
          onTagRemove?.(_t);
          input.focus();
        },
      });
      root.insertBefore(tagEl, input);
    }
  }

  // Input element
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = _tags.length > 0 ? "" : placeholder;
  input.style.cssText =
    "flex:1;min-width:80px;border:none;outline:none;font-size:13px;" +
    "background:transparent;padding:4px 0;line-height:1.4;";

  root.appendChild(input);

  // Add button
  let addBtn: HTMLElement | null = null;
  if (showAddButton) {
    addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "+ Add";
    addBtn.style.cssText =
      "padding:3px 10px;border:1px solid #d1d5db;border-radius:6px;" +
      "background:#f9fafb;font-size:12px;cursor:pointer;color:#6b7280;" +
      "white-space:nowrap;margin-left:4px;";
    addBtn.addEventListener("click", () => {
      const val = input.value.trim();
      if (val) addTagFromString(val);
    });
    root.appendChild(addBtn);
  }

  // Suggestion dropdown
  function showSuggestions(filter: string): void {
    hideSuggestions();

    if (!filter) return;

    const matches = _options.filter((o) =>
      o.toLowerCase().includes(filter.toLowerCase()) &&
      (!_tags.some((t) => t.label.toLowerCase() === o.toLowerCase()) || allowDuplicates),
    );

    if (matches.length === 0 && !allowCustom) return;

    suggestionBox = document.createElement("div");
    suggestionBox.className = "tag-suggestion-box";
    suggestionBox.style.cssText =
      "position:absolute;z-index:100;min-width:200px;max-height:200px;overflow-y:auto;" +
      "background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);" +
      "margin-top:2px;padding:4px 0;";

    // Position below input
    const rect = root.getBoundingClientRect();
    suggestionBox.style.left = `${rect.left}px`;
    suggestionBox.style.top = `${rect.bottom + window.scrollY + 2}px`;

    _activeSuggestion = -1;

    for (let i = 0; i < matches.length; i++) {
      const item = document.createElement("div");
      item.textContent = matches[i];
      item.dataset.value = matches[i]!;
      item.style.cssText =
        "padding:6px 12px;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;";

      item.addEventListener("mouseenter", () => {
        _activeSuggestion = i;
        _highlightSuggestion(i);
      });

      item.addEventListener("click", () => {
        addTagFromString(matches[i]!);
        input.value = "";
        hideSuggestions();
      });

      suggestionBox.appendChild(item);
    }

    if (allowCustom && filter && !matches.includes(filter)) {
      const customItem = document.createElement("div");
      customItem.innerHTML = `<span style="opacity:0.5;">+</span> Create "${filter}"`;
      customItem.dataset.isCustom = "true";
      customItem.dataset.value = filter;
      customItem.style.cssText =
        "padding:6px 12px;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;" +
        "border-top:1px solid #f3f4f6;margin-top:2px;padding-top:6px;color:#3b82f6;";

      customItem.addEventListener("click", () => {
        addTagFromString(filter);
        input.value = "";
        hideSuggestions();
      });

      suggestionBox.appendChild(customItem);
    }

    document.body.appendChild(suggestionBox);
  }

  function hideSuggestions(): void {
    if (suggestionBox) {
      suggestionBox.remove();
      suggestionBox = null;
    }
    _activeSuggestion = -1;
  }

  function _highlightSuggestion(idx: number): void {
    if (!suggestionBox) return;
    const items = suggestionBox.querySelectorAll("[data-value]");
    items.forEach((item, i) => {
      (item as HTMLElement).style.background = i === idx ? "#eff6ff" : "";
    });
  }

  function addTagFromString(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (_tags.length >= maxTags) return false;
    if (!allowDuplicates && _tags.some((t) => t.label.toLowerCase() === trimmed.toLowerCase())) return false;

    const newTag: TagOptions = { label: trimmed, variant: tagVariant };
    _tags.push(newTag);
    renderTags();
    input.value = "";
    input.placeholder = "";
    onChange?.(_tags);
    onTagAdd?.(newTag);
    return true;
  }

  // Event handlers
  input.addEventListener("input", () => {
    const val = input.value.trim();
    if (val) showSuggestions(val);
    else hideSuggestions();
  });

  input.addEventListener("keydown", (e) => {
    // Navigate suggestions
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && suggestionBox) {
      e.preventDefault();
      const items = suggestionBox.querySelectorAll("[data-value]");
      const maxIdx = items.length - 1;

      if (e.key === "ArrowDown") {
        _activeSuggestion = _activeSuggestion >= maxIdx ? 0 : _activeSuggestion + 1;
      } else {
        _activeSuggestion = _activeSuggestion <= 0 ? maxIdx : _activeSuggestion - 1;
      }

      _highlightSuggestion(_activeSuggestion);

      // Scroll into view
      const activeEl = items[_activeSuggestion] as HTMLElement;
      if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
      return;
    }

    // Select suggestion
    if (e.key === "Enter" && suggestionBox && _activeSuggestion >= 0) {
      e.preventDefault();
      const activeEl = suggestionBox.querySelectorAll("[data-value]")[_activeSuggestion] as HTMLElement;
      if (activeEl) {
        addTagFromString(activeEl.dataset.value!);
        input.value = "";
        hideSuggestions();
      }
      return;
    }

    // Add tag on Enter
    if (e.key === "Enter") {
      e.preventDefault();
      const val = input.value.trim();
      if (val) addTagFromString(val);
      return;
    }

    // Close on Escape
    if (e.key === "Escape") {
      hideSuggestions();
      return;
    }
  });

  // Hide suggestions on outside click
  document.addEventListener("click", (e) => {
    if (!root.contains(e.target as Node)) hideSuggestions();
  });

  // Initial render
  renderTags();

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function getTags(): TagOptions[] { return [..._tags]; }

  function addTag(tag: TagOptions): boolean {
    if (_tags.length >= maxTags) return false;
    if (!allowDuplicates && _tags.some((t) => t.label.toLowerCase() === tag.label.toLowerCase())) return false;
    _tags.push(tag);
    renderTags();
    onChange?.(_tags);
    onTagAdd?.(tag);
    return true;
  }

  function removeTag(indexOrLabel: number | string): void {
    let idx: number;
    if (typeof indexOrLabel === "string") {
      idx = _tags.findIndex((t) => t.label === indexOrLabel);
    } else {
      idx = indexOrLabel;
    }
    if (idx >= 0 && idx < _tags.length) {
      const removed = _tags.splice(idx, 1)[0]!;
      renderTags();
      onChange?.(_tags);
      onTagRemove?.(removed);
    }
  }

  function clearTags(): void {
    _tags = [];
    renderTags();
    input.placeholder = placeholder;
    onChange?.(_tags);
  }

  function focus(): void { input.focus(); }

  function setOptions(opts: string[]): void { _options = opts; }

  function destroy(): void {
    hideSuggestions();
    root.remove();
  }

  return { el: root, getTags, addTag, removeTag, clearTags, focus, setOptions, destroy };
}

// --- Core Factory: Tag Cloud ---

/**
 * Create a tag cloud visualization.
 *
 * @example
 * ```ts
 * const cloud = createTagCloud({
 *   items: [
 *     { label: "JavaScript", weight: 10 },
 *     { label: "TypeScript", weight: 9 },
 *     { label: "React", weight: 8 },
 *     { label: "CSS", weight: 6 },
 *     { label: "HTML", weight: 5 },
 *   ],
 *   colorScheme: "cool",
 * });
 * ```
 */
export function createTagCloud(options: TagCloudOptions): HTMLElement {
  const {
    items,
    minFontSize = 12,
    maxFontSize = 36,
    colorScheme = "monochrome",
    spiral = true,
    className,
    container,
  } = options;

  const root = document.createElement("div");
  root.className = `tag-cloud ${className ?? ""}`.trim();
  root.style.cssText =
    "display:flex;flex-wrap:wrap;align-items:center;justify-content:center;" +
    "gap:8px 16px;padding:20px;width:100%;min-height:120px;";

  // Color schemes
  const schemeColors: Record<string, string[]> = {
    monochrome: ["#374151", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db"],
    warm: ["#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d"],
    cool: ["#2563eb", "#0284c7", "#0891b2", "#0d9488", "#059669"],
    rainbow: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"],
  };

  const colors = schemeColors[colorScheme] ?? schemeColors.monochrome;

  // Normalize weights to [0, 1]
  const weights = items.map((item) => item.weight ?? 5);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const normWeight = (weights[i]! - minW) / range;
    const fontSize = minFontSize + normWeight * (maxFontSize - minFontSize);
    const colorIdx = Math.floor(normWeight * (colors.length - 1));

    const tagEl = document.createElement("span");
    tagEl.className = "cloud-tag";
    tagEl.textContent = item.label;
    tagEl.style.cssText =
      `display:inline-block;font-size:${fontSize}px;font-weight:${
        normWeight > 0.7 ? "700" : normWeight > 0.4 ? "600" : "500"
      };color:${colors[colorIdx]!};` +
      "cursor:pointer;transition:transform 0.15s ease,color 0.15s ease;" +
      "line-height:1.3;padding:2px 6px;border-radius:4px;";

    tagEl.addEventListener("mouseenter", () => {
      tagEl.style.transform = "scale(1.1)";
      tagEl.style.color = colors[Math.min(colorIdx + 1, colors.length - 1)]!;
    });
    tagEl.addEventListener("mouseleave", () => {
      tagEl.style.transform = "";
      tagEl.style.color = colors[colorIdx]!;
    });

    if (item.url) {
      tagEl.style.textDecoration = "underline";
      tagEl.style.textUnderlineOffset = "3px";
      tagEl.addEventListener("click", () => window.open(item.url, "_blank"));
    } else if (item.onClick) {
      tagEl.addEventListener("click", item.onClick);
    }

    root.appendChild(tagEl);
  }

  (container ?? document.body).appendChild(root);

  return root;
}
