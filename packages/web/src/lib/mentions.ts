/**
 * Mentions / @-mention Input: Textarea or input with autocomplete for mentioning
 * users, teams, or entities. Supports trigger characters, async data loading,
 * custom rendering, keyboard navigation, and multi-word matching.
 */

// --- Types ---

export interface MentionItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Avatar URL (optional) */
  avatar?: string;
  /** Subtitle/description (e.g., email, role) */
  subtitle?: string;
  /** Custom data */
  data?: unknown;
}

export interface MentionTrigger {
  /** Character that triggers the mention (default: "@") */
  char: string;
  /** Data source: static list or async loader */
  items: MentionItem[] | ((query: string) => Promise<MentionItem[]>);
  /** Maximum suggestions shown (default: 8) */
  maxSuggestions?: number;
  /** Allow spaces in query? (default: false) */
  allowSpaces?: boolean;
}

export type MentionMode = "textarea" | "input";

export interface MentionsOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Input mode */
  mode?: MentionMode;
  /** Trigger configurations */
  triggers?: MentionTrigger[];
  /** Placeholder text */
  placeholder?: string;
  /** Initial value */
  value?: string;
  /** Rows for textarea mode (default: 4) */
  rows?: number;
  /** Max height for textarea (px) */
  maxHeight?: number;
  /** Debounce delay for async search (ms, default: 150) */
  debounceDelay?: number;
  /** Callback on value change */
  onChange?: (value: string) => void;
  /** Callback when a mention is inserted */
  onMentionInsert?: (item: MentionItem, triggerChar: string) => void;
  /** Custom render function for suggestion item */
  renderItem?: (item: MentionItem, query: string) => HTMLElement;
  /** Custom CSS class */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface MentionsInstance {
  element: HTMLElement;
  inputEl: HTMLTextAreaElement | HTMLInputElement;
  getValue: () => string;
  setValue: (value: string) => void;
  getMentions: () => Array<{ trigger: string; item: MentionItem; offset: number }>;
  focus: () => void;
  destroy: () => void;
}

// --- Helpers ---

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getCaretCoordinates(el: HTMLTextAreaElement | HTMLInputElement): { top: number; left: number } {
  // Use a mirror div approach for textarea caret position
  if (el instanceof HTMLTextAreaElement) {
    const mirror = document.createElement("div");
    const style = window.getComputedStyle(el);
    mirror.style.cssText = `
      position:absolute;top:-9999px;left:-9999px;
      white-space:pre-wrap;word-wrap:break-word;
      font:${style.font};font-size:${style.fontSize};
      line-height:${style.lineHeight};padding:${style.padding};
      border:${style.border};width:${style.width};
      box-sizing:border-box;overflow:hidden;
    `;
    document.body.appendChild(mirror);

    // Copy text up to cursor
    const text = el.value.substring(0, el.selectionStart ?? 0);
    mirror.textContent = text;

    // Add a span at the end to measure position
    const span = document.createElement("span");
    span.textContent = "|";
    mirror.appendChild(span);

    const rect = span.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const result = { top: rect.top - elRect.top + el.scrollTop, left: rect.left - elRect.left + el.scrollLeft };

    mirror.remove();
    return result;
  }

  // For regular inputs, use a simpler approach
  return { top: el.offsetHeight, left: Math.min(el.selectionStart ?? 0 * 8, el.offsetWidth - 100) };
}

// --- Main Class ---

export class MentionsManager {
  create(options: MentionsOptions): MentionsInstance {
    const opts = {
      mode: options.mode ?? "textarea",
      placeholder: options.placeholder ?? "Type @ to mention...",
      rows: options.rows ?? 4,
      maxHeight: options.maxHeight ?? 200,
      debounceDelay: options.debounceDelay ?? 150,
      disabled: options.disabled ?? false,
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Mentions: container element not found");

    container.className = `mentions ${opts.className}`;
    container.style.position = "relative";

    // Create input/textarea
    let inputEl: HTMLTextAreaElement | HTMLInputElement;

    if (opts.mode === "textarea") {
      inputEl = document.createElement("textarea");
      (inputEl as HTMLTextAreaElement).rows = opts.rows;
      inputEl.style.cssText = `
        width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;
        font-size:14px;font-family:-apple-system,sans-serif;line-height:1.5;
        resize:vertical;outline:none;transition:border-color 0.15s;
        box-sizing:border-box;${opts.maxHeight ? `max-height:${opts.maxHeight}px;` : ""}
        ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
      `;
    } else {
      inputEl = document.createElement("input");
      inputEl.type = "text";
      inputEl.style.cssText = `
        width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;
        font-size:14px;font-family:-apple-system,sans-serif;outline:none;
        transition:border-color 0.15s;box-sizing:border-box;
        ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
      `;
    }

    inputEl.placeholder = opts.placeholder;
    if (opts.value) inputEl.value = opts.value;
    container.appendChild(inputEl);

    // Suggestions dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "mentions-dropdown";
    dropdown.style.cssText = `
      position:absolute;display:none;z-index:10500;
      min-width:240px;max-width:360px;max-height:260px;overflow-y:auto;
      background:#fff;border-radius:10px;
      box-shadow:0 10px 40px rgba(0,0,0,0.15),0 2px 6px rgba(0,0,0,0.06);
      border:1px solid #e5e7eb;padding:4px;font-family:-apple-system,sans-serif;
    `;
    container.appendChild(dropdown);

    // Default triggers
    const triggers: MentionTrigger[] = opts.triggers ?? [
      { char: "@", items: [] },
    ];

    // State
    let isOpen = false;
    let activeTrigger: MentionTrigger | null = null;
    let activeQuery = "";
    let activeQueryStart = 0;
    let selectedIdx = -1;
    let suggestions: MentionItem[] = [];
    let destroyed = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const isAsyncSource = (t: MentionTrigger) => typeof t.items === "function";

    function findActiveTrigger(): { trigger: MentionTrigger | null; query: string; start: number } | null {
      const pos = inputEl.selectionStart ?? 0;
      const text = inputEl.value;

      // Search backwards from cursor for a trigger character
      for (let i = pos - 1; i >= 0; i--) {
        const ch = text[i];
        for (const t of triggers) {
          if (ch === t.char) {
            const query = text.substring(i + 1, pos);
            // Check if query contains disallowed characters
            if (!query.includes(" ") || t.allowSpaces) {
              // Make sure it's not part of a word (trigger should be preceded by space/start)
              if (i === 0 || /[\s\n]/.test(text[i - 1]!)) {
                return { trigger: t, query, start: i };
              }
            }
          }
        }
        // Stop at word boundary
        if (/[\s\n]/.test(ch)) break;
      }

      return null;
    }

    async function loadSuggestions(trigger: MentionTrigger, query: string): Promise<void> {
      if (isAsyncSource(trigger)) {
        suggestions = await (trigger.items as (q: string) => Promise<MentionItem[]>)(query);
      } else {
        const all = trigger.items as MentionItem[];
        const q = query.toLowerCase();
        suggestions = all.filter((item) =>
          item.label.toLowerCase().includes(q) ||
          (item.subtitle?.toLowerCase().includes(q))
        );
      }
      suggestions = suggestions.slice(0, trigger.maxSuggestions ?? 8);
    }

    function positionDropdown(): void {
      const coords = getCaretCoordinates(inputEl);
      dropdown.style.top = `${coords.top + 24}px`;
      dropdown.style.left = `${Math.min(coords.left, (container.clientWidth ?? 300) - 260)}px`;
    }

    function renderDropdown(): void {
      dropdown.innerHTML = "";

      if (suggestions.length === 0) {
        const noRes = document.createElement("div");
        noRes.style.cssText = "padding:12px;text-align:center;color:#9ca3af;font-size:13px;";
        noRes.textContent = "No results";
        dropdown.appendChild(noRes);
        return;
      }

      for (let i = 0; i < suggestions.length; i++) {
        const item = suggestions[i]!;
        const itemEl = document.createElement("div");
        itemEl.className = "mention-item";
        itemEl.dataset.index = String(i);
        itemEl.tabIndex = -1;
        itemEl.style.cssText = `
          display:flex;align-items:center;gap:10px;padding:8px 12px;
          cursor:pointer;border-radius:6px;transition:background 0.1s;
          ${i === selectedIdx ? "background:#eef2ff;" : ""}
        `;

        if (opts.renderItem) {
          const custom = opts.renderItem(item, activeQuery);
          itemEl.appendChild(custom);
        } else {
          // Avatar
          if (item.avatar) {
            const av = document.createElement("img");
            av.src = item.avatar;
            av.alt = "";
            av.style.cssText = "width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;";
            itemEl.appendChild(av);
          } else {
            const avPlaceholder = document.createElement("span");
            avPlaceholder.textContent = item.label.charAt(0).toUpperCase();
            avPlaceholder.style.cssText = `
              width:28px;height:28px;border-radius:50%;background:#eef2ff;color:#4338ca;
              display:flex;align-items:center;justify-content:center;font-weight:600;
              font-size:13px;flex-shrink:0;
            `;
            itemEl.appendChild(avPlaceholder);
          }

          // Info column
          const info = document.createElement("div");
          info.style.cssText = "flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;";

          const name = document.createElement("span");
          name.style.cssText = "font-size:13px;font-weight:500;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
          name.textContent = item.label;
          info.appendChild(name);

          if (item.subtitle) {
            const sub = document.createElement("span");
            sub.style.cssText = "font-size:11px;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
            sub.textContent = item.subtitle;
            info.appendChild(sub);
          }

          itemEl.appendChild(info);
        }

        itemEl.addEventListener("click", () => selectItem(i));
        itemEl.addEventListener("mouseenter", () => {
          selectedIdx = i;
          highlightSelected();
        });

        dropdown.appendChild(itemEl);
      }
    }

    function highlightSelected(): void {
      const items = dropdown.querySelectorAll(".mention-item");
      items.forEach((item, idx) => {
        (item as HTMLElement).style.background = idx === selectedIdx ? "#eef2ff" : "";
      });
    }

    function selectItem(idx: number): void {
      if (idx < 0 || idx >= suggestions.length || !activeTrigger) return;

      const item = suggestions[idx]!;
      const text = inputEl.value;

      // Replace from trigger start to cursor with mention text
      const before = text.substring(0, activeQueryStart);
      const after = text.substring(inputEl.selectionStart ?? text.length);
      const insertText = `${activeTrigger.char}${item.label} `;

      inputEl.value = before + insertText + after;

      // Position cursor after insertion
      const newPos = before.length + insertText.length;
      inputEl.setSelectionRange(newPos, newPos);

      closeDropdown();
      opts.onChange?.(inputEl.value);
      opts.onMentionInsert?.(item, activeTrigger.char);
      inputEl.focus();
    }

    function openDropdown(): void {
      if (isOpen) return;
      isOpen = true;
      dropdown.style.display = "block";
      positionDropdown();
    }

    function closeDropdown(): void {
      isOpen = false;
      activeTrigger = null;
      activeQuery = "";
      selectedIdx = -1;
      suggestions = [];
      dropdown.style.display = "none";
    }

    // Event handlers

    inputEl.addEventListener("input", () => {
      const found = findActiveTrigger();

      if (found && found.trigger) {
        activeTrigger = found.trigger;
        activeQuery = found.query;
        activeQueryStart = found.start;
        selectedIdx = -1;

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          await loadSuggestions(activeTrigger!, activeQuery);
          openDropdown();
          renderDropdown();
        }, opts.debounceDelay);
      } else {
        closeDropdown();
      }

      opts.onChange?.(inputEl.value);
    });

    inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          selectedIdx = Math.min(selectedIdx + 1, suggestions.length - 1);
          highlightSelected();
          break;
        case "ArrowUp":
          e.preventDefault();
          selectedIdx = Math.max(selectedIdx - 1, 0);
          highlightSelected();
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          selectItem(selectedIdx >= 0 ? selectedIdx : 0);
          break;
        case "Escape":
          e.preventDefault();
          closeDropdown();
          break;
      }
    });

    inputEl.addEventListener("blur", () => {
      setTimeout(() => {
        if (!dropdown.contains(document.activeElement)) {
          closeDropdown();
        }
      }, 150);
    });

    inputEl.addEventListener("focus", () => {
      // Re-check for active trigger on focus
    });

    // Click outside to close
    document.addEventListener("mousedown", (e: MouseEvent) => {
      if (!container.contains(e.target as Node)) {
        closeDropdown();
      }
    });

    function getMentions(): Array<{ trigger: string; item: MentionItem; offset: number }> {
      const results: Array<{ trigger: string; item: MentionItem; offset: number }> = [];
      const text = inputEl.value;

      for (const trigger of triggers) {
        let searchFrom = 0;
        while (true) {
          const idx = text.indexOf(trigger.char, searchFrom);
          if (idx === -1) break;

          // Find end of mention (space or end of string)
          let end = idx + 1;
          while (end < text.length && !/\s/.test(text[end]!)) end++;
          const mentionText = text.substring(idx + 1, end);

          // Try to match against known items
          for (const item of Array.isArray(trigger.items) ? trigger.items as MentionItem[] : []) {
            if (item.label === mentionText) {
              results.push({ trigger: trigger.char, item, offset: idx });
            }
          }

          searchFrom = end;
        }
      }

      return results;
    }

    const instance: MentionsInstance = {
      element: container,
      inputEl,

      getValue() { return inputEl.value; },

      setValue(val: string) {
        inputEl.value = val;
        opts.onChange?.(val);
      },

      getMentions,

      focus() { inputEl.focus(); },

      destroy() {
        destroyed = true;
        if (debounceTimer) clearTimeout(debounceTimer);
        dropdown.remove();
        inputEl.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a mentions input */
export function createMentions(options: MentionsOptions): MentionsInstance {
  return new MentionsManager().create(options);
}
