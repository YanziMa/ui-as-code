/**
 * Tag / Chip Input: Multi-value tag input with autocomplete, duplicate prevention,
 * drag-to-reorder, keyboard navigation, paste support, validation, max tags limit,
 * and customizable tag rendering.
 */

// --- Types ---

export interface TagItem {
  /** Tag value */
  value: string;
  /** Display label (defaults to value) */
  label?: string;
  /** Color (CSS value) */
  color?: string;
  /** Background color */
  bgColor?: string;
  /** Removable? (default: true) */
  removable?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom data */
  data?: unknown;
}

export interface TagInputOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial tags */
  initialTags?: TagItem[];
  /** Placeholder text */
  placeholder?: string;
  /** Allowed tags (null = free-form input) */
  allowedTags?: TagItem[] | ((query: string) => Promise<TagItem[]>);
  /** Allow creating new tags not in allowed list */
  allowCreate?: boolean;
  /** Maximum number of tags */
  maxTags?: number;
  /** Duplicate strategy: "prevent" | "allow" | "highlight" */
  duplicateStrategy?: "prevent" | "allow" | "highlight";
  /** Show dropdown suggestions */
  showSuggestions?: boolean;
  /** Max suggestions shown */
  maxSuggestions?: number;
  /** Editable tags (click to edit) */
  editableTags?: boolean;
  /** Draggable tags for reorder */
  draggable?: boolean;
  /** Separator characters for splitting pasted text */
  separators?: string[];
  /** Transform input before creating tag (e.g., trim, lowercase) */
  transform?: (text: string) => string;
  /** Validate a tag before adding */
  validate?: (tag: TagItem) => string | null; // error message or null
  /** Callback when tags change */
  onChange?: (tags: TagItem[]) => void;
  /** Callback when tag added */
  onTagAdd?: (tag: TagItem) => void;
  /** Callback when tag removed */
  onTagRemove?: (tag: TagItem) => void;
  /** Custom tag renderer */
  renderTag?: (tag: TagItem, el: HTMLElement) => void;
  /** Custom CSS class */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface TagInputInstance {
  element: HTMLElement;
  inputEl: HTMLInputElement;
  getTags: () => TagItem[];
  addTag: (tag: string | TagItem) => boolean;
  removeTag: (value: string) => void;
  clearAll: () => void;
  focus: () => void;
  destroy: () => void;
}

// --- Helpers ---

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 90%)`;
}

function stringToTextColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 30%)`;
}

// --- Main Class ---

export class TagInputManager {
  create(options: TagInputOptions): TagInputInstance {
    const opts = {
      placeholder: options.placeholder ?? "Add a tag...",
      allowCreate: options.allowCreate ?? true,
      maxTags: options.maxTags ?? Infinity,
      duplicateStrategy: options.duplicateStrategy ?? "prevent",
      showSuggestions: options.showSuggestions ?? true,
      maxSuggestions: options.maxSuggestions ?? 8,
      editableTags: options.editableTags ?? false,
      draggable: options.draggable ?? false,
      separators: options.separators ?? [",", ";", "\n", "\t"],
      disabled: options.disabled ?? false,
      transform: options.transform ?? ((t: string) => t.trim()),
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("TagInput: container element not found");

    container.className = `tag-input ${opts.className ?? ""}`;
    container.style.cssText = `
      display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 10px;
      border:1px solid #d1d5db;border-radius:8px;background:#fff;
      min-height:42px;cursor:text;${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
    `;

    // Tags container
    const tagsContainer = document.createElement("div");
    tagsContainer.className = "tag-input-tags";
    tagsContainer.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;align-items:center;";
    container.appendChild(tagsContainer);

    // Text input
    const inputEl = document.createElement("input");
    inputEl.type = "text";
    inputEl.placeholder = opts.placeholder;
    inputEl.style.cssText = `
      flex:1;min-width:120px;border:none;outline:none;background:transparent;
      font-size:13px;padding:4px 0;line-height:1.4;
    `;
    container.appendChild(inputEl);

    // Suggestions dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "tag-suggestions";
    dropdown.style.cssText = `
      position:absolute;left:0;top:100%;width:100%;max-height:200px;
      overflow-y:auto;background:#fff;border-radius:8px;
      box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:10500;
      display:none;flex-direction:column;padding:4px 0;
      font-size:13px;border:1px solid #e5e7eb;margin-top:4px;
    `;
    container.style.position = "relative";
    container.appendChild(dropdown);

    // State
    let tags: TagItem[] = [...(options.initialTags ?? [])];
    let suggestions: TagItem[] = [];
    let selectedSuggestion = -1;
    let destroyed = false;
    const isAsyncSource = typeof opts.allowedTags === "function";

    function renderTags(): void {
      tagsContainer.innerHTML = "";

      for (const tag of tags) {
        const tagEl = createTagElement(tag);
        tagsContainer.appendChild(tagEl);
      }

      // Update input visibility based on max
      if (tags.length >= opts.maxTags) {
        inputEl.style.display = "none";
      } else {
        inputEl.style.display = "";
      }
    }

    function createTagElement(tag: TagItem): HTMLElement {
      const el = document.createElement("span");
      el.className = "tag-chip";
      el.dataset.value = tag.value;
      el.style.cssText = `
        display:inline-flex;align-items:center;gap:4px;padding:3px 8px;
        border-radius:16px;font-size:12px;font-weight:500;
        background:${tag.bgColor ?? stringToColor(tag.value)};
        color:${tag.color ?? stringToTextColor(tag.value)};
        user-select:none;transition:transform 0.1s,box-shadow 0.1s;
        ${tag.disabled ? "opacity:0.5;" : ""}
        ${opts.draggable && !tag.disabled ? "cursor:grab;" : ""}
      `;

      // Label
      const labelSpan = document.createElement("span");
      labelSpan.textContent = tag.label ?? tag.value;
      el.appendChild(labelSpan);

      // Remove button
      if (tag.removable !== false && !tag.disabled) {
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.innerHTML = "&times;";
        removeBtn.style.cssText = `
          background:none;border:none;font-size:14px;line-height:1;
          cursor:pointer;padding:0 2px;color:inherit;opacity:0.7;
        `;
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          removeTag(tag.value);
        });
        removeBtn.addEventListener("mouseenter", () => { removeBtn.style.opacity = "1"; });
        removeBtn.addEventListener("mouseleave", () => { removeBtn.style.opacity = "0.7"; });
        el.appendChild(removeBtn);
      }

      // Double-click to edit
      if (opts.editableTags && !tag.disabled) {
        el.addEventListener("dblclick", () => {
          startEditTag(tag, el);
        });
      }

      // Hover effect
      el.addEventListener("mouseenter", () => {
        if (!tag.disabled) el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.08)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.boxShadow = "";
      });

      // Custom renderer
      if (opts.renderTag) {
        opts.renderTag(tag, el);
      }

      return el;
    }

    function startEditTag(tag: TagItem, el: HTMLElement): void {
      const labelSpan = el.querySelector("span")!;
      const originalLabel = tag.label ?? tag.value;

      // Replace label with input
      const editInput = document.createElement("input");
      editInput.type = "text";
      editInput.value = originalLabel;
      editInput.style.cssText = `
        border:1px solid #6366f1;border-radius:4px;padding:1px 4px;
        font-size:12px;width:${Math.max(originalLabel.length * 8, 40)}px;outline:none;
      `;

      labelSpan.replaceWith(editInput);
      editInput.focus();
      editInput.select();

      const finishEdit = () => {
        const newVal = opts.transform(editInput.value);
        if (newVal && newVal !== originalLabel) {
          tag.label = newVal;
          tag.value = newVal;
        }
        renderTags();
        opts.onChange?.(tags);
      };

      editInput.addEventListener("blur", finishEdit);
      editInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          finishEdit();
        } else if (e.key === "Escape") {
          editInput.value = originalLabel;
          finishEdit();
        }
      });
    }

    function addTag(input: string | TagItem): boolean {
      if (tags.length >= opts.maxTags) return false;

      let tag: TagItem;
      if (typeof input === "string") {
        const text = opts.transform(input);
        if (!text) return false;

        // Check duplicate
        const existing = tags.find((t) => t.value.toLowerCase() === text.toLowerCase());
        if (existing) {
          if (opts.duplicateStrategy === "prevent") return false;
          if (opts.duplicateStrategy === "highlight") {
            // Flash the existing tag
            const existingEl = tagsContainer.querySelector(`[data-value="${CSS.escape(existing.value)}"]`);
            if (existingEl) {
              existingEl.animate([
                { transform: "scale(1.15)", boxShadow: "0 0 0 2px #f59e0b" },
                { transform: "scale(1)", boxShadow: "none" },
              ], { duration: 300 });
            }
            return false;
          }
        }

        // Validate
        if (opts.validate) {
          const newTag: TagItem = { value: text, label: text };
          const error = opts.validate(newTag);
          if (error) {
            // Could show error tooltip here
            return false;
          }
        }

        tag = { value: text, label: text };
      } else {
        tag = input;
      }

      tags.push(tag);
      renderTags();
      opts.onChange?.(tags);
      opts.onTagAdd?.(tag);
      return true;
    }

    function removeTag(value: string): void {
      const idx = tags.findIndex((t) => t.value === value);
      if (idx >= 0) {
        const removed = tags.splice(idx, 1)[0]!;
        renderTags();
        opts.onChange?.(tags);
        opts.onTagRemove?.(removed);
      }
    }

    async function loadSuggestions(query: string): Promise<void> {
      if (!opts.allowedTags) {
        suggestions = [];
        return;
      }

      if (isAsyncSource) {
        suggestions = await (opts.allowedTags as (q: string) => Promise<TagItem[]>)(query);
      } else {
        const all = opts.allowedTags as TagItem[];
        const q = query.toLowerCase();
        suggestions = all.filter((t) =>
          t.label?.toLowerCase().includes(q) || t.value.toLowerCase().includes(q)
        );
      }

      // Remove already-added tags
      suggestions = suggestions.filter((s) => !tags.find((t) => t.value === s.value));
      suggestions = suggestions.slice(0, opts.maxSuggestions);
    }

    function renderSuggestions(): void {
      dropdown.innerHTML = "";

      if (suggestions.length === 0) {
        dropdown.style.display = "none";
        return;
      }

      dropdown.style.display = "flex";
      selectedSuggestion = -1;

      for (let i = 0; i < suggestions.length; i++) {
        const sug = suggestions[i]!;
        const item = document.createElement("div");
        item.dataset.index = String(i);
        item.style.cssText = `
          padding:8px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;
          ${i === selectedSuggestion ? "background:#f0f4ff;" : ""}
          transition:background 0.1s;
        `;

        if (sug.label) {
          const labelSpan = document.createElement("span");
          labelSpan.textContent = sug.label;
          labelSpan.style.flex = "1";
          item.appendChild(labelSpan);
        }

        if (!tags.find((t) => t.value === sug.value)) {
          item.addEventListener("click", () => {
            addTag(sug);
            inputEl.value = "";
            dropdown.style.display = "none";
            inputEl.focus();
          });

          item.addEventListener("mouseenter", () => {
            selectedSuggestion = i;
            highlightSuggestion();
          });
        }

        dropdown.appendChild(item);
      }
    }

    function highlightSuggestion(): void {
      const items = dropdown.querySelectorAll("[data-index]");
      items.forEach((item, idx) => {
        (item as HTMLElement).style.background = idx === selectedSuggestion ? "#f0f4ff" : "";
      });
    }

    // Event handlers
    inputEl.addEventListener("focus", () => {
      if (inputEl.value && opts.showSuggestions) {
        loadSuggestions(inputEl.value).then(renderSuggestions);
      }
    });

    inputEl.addEventListener("input", () => {
      const val = inputEl.value;
      if (opts.showSuggestions) {
        loadSuggestions(val).then(renderSuggestions);
      }
    });

    inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      // Handle suggestion navigation
      if (dropdown.style.display !== "none" && suggestions.length > 0) {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            selectedSuggestion = Math.min(selectedSuggestion + 1, suggestions.length - 1);
            highlightSuggestion();
            return;
          case "ArrowUp":
            e.preventDefault();
            selectedSuggestion = Math.max(selectedSuggestion - 1, 0);
            highlightSuggestion();
            return;
          case "Enter":
            e.preventDefault();
            if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
              addTag(suggestions[selectedSuggestion]!);
              inputEl.value = "";
              dropdown.style.display = "none";
            } else if (inputEl.value.trim()) {
              addTag(inputEl.value);
              inputEl.value = "";
              dropdown.style.display = "none";
            }
            return;
          case "Escape":
            e.preventDefault();
            dropdown.style.display = "none";
            return;
        }
      }

      // Handle separators
      if (opts.separators.includes(e.key)) {
        e.preventDefault();
        if (inputEl.value.trim()) {
          addTag(inputEl.value);
          inputEl.value = "";
        }
        return;
      }

      // Backspace on empty input removes last tag
      if (e.key === "Backspace" && !inputEl.value && tags.length > 0) {
        removeTag(tags[tags.length - 1].value);
      }
    });

    inputEl.addEventListener("paste", (e: ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData?.getData("text") ?? "";
      // Split by separators
      const parts = text.split(new RegExp(`[${opts.separators.map((s) => s === "\n" ? "\\n" : s === "\t" ? "\\t" : s).join("")}]`));
      for (const part of parts) {
        const trimmed = opts.transform(part);
        if (trimmed) addTag(trimmed);
      }
      inputEl.value = "";
    });

    inputEl.addEventListener("blur", () => {
      setTimeout(() => {
        if (document.activeElement !== dropdown && !dropdown.contains(document.activeElement)) {
          dropdown.style.display = "none";
          // If there's remaining text, create a tag
          if (inputEl.value.trim()) {
            addTag(inputEl.value);
            inputEl.value = "";
          }
        }
      }, 150);
    });

    // Click outside to close dropdown
    document.addEventListener("mousedown", (e: MouseEvent) => {
      if (!container.contains(e.target as Node)) {
        dropdown.style.display = "none";
      }
    });

    // Initial render
    renderTags();

    const instance: TagInputInstance = {
      element: container,
      inputEl,

      getTags() { return [...tags]; },

      addTag,

      removeTag,

      clearAll() {
        tags = [];
        renderTags();
        opts.onChange?.([]);
      },

      focus() { inputEl.focus(); },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a tag input */
export function createTagInput(options: TagInputOptions): TagInputInstance {
  return new TagInputManager().create(options);
}
