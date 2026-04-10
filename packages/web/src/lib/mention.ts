/**
 * Mention: @mention autocomplete in textareas/inputs, with dropdown suggestions,
 * trigger character config, async loading, highlight mentions in text,
 * keyboard navigation, and multi-trigger support.
 */

// --- Types ---

export interface MentionOption {
  id: string;
  label: string;
  avatar?: string;
  description?: string;
  disabled?: boolean;
}

export interface MentionOptions {
  /** Textarea or input element (or selector) */
  element: HTMLTextAreaElement | HTMLInputElement | string;
  /** Trigger character(s) (default: ["@"]) */
  triggers?: string[];
  /** Options list or async loader */
  options: MentionOption[] | ((query: string, trigger: string) => Promise<MentionOption[]>);
  /** Minimum characters after trigger to show suggestions (default: 0) */
  minLength?: number;
  /** Debounce ms (default: 200) */
  debounceMs?: number;
  /** Maximum visible suggestions */
  maxSuggestions?: number;
  /** No results text */
  noResultsText?: string;
  /** Loading text */
  loadingText?: string;
  /** Highlight matched text */
  highlightMatch?: boolean;
  /** Custom option renderer */
  renderItem?: (option: MentionOption, query: string) => HTMLElement;
  /** Callback on mention inserted */
  onMention?: (option: MentionOption) => void;
  /** Callback on text change (without mention) */
  onChange?: (text: string) => void;
  /** Dropdown z-index */
  zIndex?: number;
  /** Custom CSS class */
  className?: string;
}

export interface MentionInstance {
  element: HTMLTextAreaElement | HTMLInputElement;
  open: () => void;
  close: () => void;
  getText: () => string;
  setText: (text: string) => void;
  getMentions: () => Array<{ id: string; label: string; trigger: string; offset: number }>;
  destroy: () => void;
}

// --- Helpers ---

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function highlightMatch(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const q = escapeHtml(query);
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return escaped.replace(re, '<mark style="background:#fef08a;border-radius:2px;">$1</mark>');
}

function getCaretCoordinates(el: HTMLTextAreaElement | HTMLInputElement, position: number): { top: number; left: number } {
  // Use a mirror div approach for accurate positioning
  const mirror = document.createElement("div");
  const style = window.getComputedStyle(el);
  const props = [
    "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing",
    "textTransform", "wordSpacing", "textIndent", "wordWrapping", "whiteSpace",
    "borderWidth", "borderStyle", "padding", "boxSizing", "lineHeight",
    "width", "overflowY",
  ];

  mirror.style.cssText = `
    position:absolute;top:-9999px;left:-9999px;visibility:hidden;
    word-wrap:break-word;white-space:pre-wrap;
  `;
  for (const prop of props) {
    (mirror.style as unknown as Record<string, string>)[prop] = style.getPropertyValue(prop as CSSStyleDeclaration["cssPropertyName"]];
  }

  // Copy text up to caret + a marker
  const textBefore = el.value.substring(0, position);
  mirror.textContent = textBefore;
  const marker = document.createElement("span");
  marker.textContent = "|";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const rect = marker.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  mirror.remove();

  return {
    top: rect.top - elRect.top + el.scrollTop,
    left: rect.left - elRect.left + el.scrollLeft,
  };
}

// --- Main Class ---

export class MentionManager {
  create(options: MentionOptions): MentionInstance {
    const opts = {
      triggers: options.triggers ?? ["@"],
      minLength: options.minLength ?? 0,
      debounceMs: options.debounceMs ?? 200,
      maxSuggestions: options.maxSuggestions ?? 8,
      noResultsText: options.noResultsText ?? "No results",
      loadingText: options.loadingText ?? "Loading...",
      highlightMatch: opts.highlightMatch ?? true,
      zIndex: options.zIndex ?? 10500,
      ...options,
    };

    const el = typeof options.element === "string"
      ? (document.querySelector<HTMLTextAreaElement | HTMLInputElement>(options.element)!)
      : options.element;

    if (!el) throw new Error("Mention: element not found");

    // Dropdown
    const dropdown = document.createElement("div");
    dropdown.className = `mention-dropdown ${opts.className ?? ""}`;
    dropdown.setAttribute("role", "listbox");
    dropdown.style.cssText = `
      position:absolute;display:none;z-index:${opts.zIndex};
      background:#fff;border-radius:8px;
      box-shadow:0 8px 30px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.08);
      min-width:220px;max-width:320px;max-height:240px;overflow-y:auto;
      padding:4px 0;font-size:13px;font-family:-apple-system,sans-serif;
      border:1px solid #e5e7eb;
    `;
    document.body.appendChild(dropdown);

    // State
    let isOpen = false;
    let selectedIndex = -1;
    let activeTrigger: string | null = null;
    let queryStartPos = -1;
    let allOptions: MentionOption[] = [];
    let filteredOptions: MentionOption[] = [];
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let isLoading = false;
    let destroyed = false;

    const isAsyncSource = typeof options.options === "function";

    function getCurrentQuery(): string {
      if (queryStartPos < 0 || activeTrigger === null) return "";
      const pos = el.selectionStart ?? el.value.length;
      return el.value.substring(queryStartPos + 1, pos);
    }

    async function loadOptions(query: string): Promise<void> {
      isLoading = true;
      if (isAsyncSource) {
        try {
          allOptions = await (options.options as (q: string, t: string) => Promise<MentionOption[]>)(query, activeTrigger!);
        } catch {
          allOptions = [];
        }
      }
      filteredOptions = allOptions.slice(0, opts.maxSuggestions);
      isLoading = false;
      renderDropdown();
    }

    function filterLocal(query: string): void {
      const q = query.toLowerCase();
      filteredOptions = allOptions
        .filter((opt) =>
          opt.label.toLowerCase().includes(q) ||
          opt.id.toLowerCase().includes(q) ||
          (opt.description ?? "").toLowerCase().includes(q)
        )
        .slice(0, opts.maxSuggestions);
    }

    function renderDropdown(): void {
      dropdown.innerHTML = "";

      if (isLoading) {
        const loading = document.createElement("div");
        loading.style.cssText = "padding:12px 14px;text-align:center;color:#9ca3af;";
        loading.textContent = opts.loadingText;
        dropdown.appendChild(loading);
      } else if (filteredOptions.length === 0) {
        const noRes = document.createElement("div");
        noRes.style.cssText = "padding:12px 14px;text-align:center;color:#9ca3af;";
        noRes.textContent = opts.noResultsText;
        dropdown.appendChild(noRes);
      } else {
        for (let i = 0; i < filteredOptions.length; i++) {
          const opt = filteredOptions[i]!;
          const query = getCurrentQuery();

          let itemEl: HTMLElement;
          if (opts.renderItem) {
            itemEl = opts.renderItem(opt, query);
          } else {
            itemEl = document.createElement("div");
            itemEl.style.cssText = `
              display:flex;align-items:center;gap:8px;padding:7px 12px;cursor:pointer;
              ${opt.disabled ? "opacity:0.45;cursor:not-allowed;" : ""}
              transition:background 0.1s;
            `;

            // Avatar placeholder
            if (opt.avatar) {
              const avatar = document.createElement("img");
              avatar.src = opt.avatar;
              avatar.style.cssText = "width:24px;height:24px;border-radius:50%;object-fit:cover;flex-shrink:0;";
              itemEl.appendChild(avatar);
            } else {
              const avatarPlaceholder = document.createElement("span");
              avatarPlaceholder.style.cssText = `
                width:24px;height:24px;border-radius:50%;background:#eef2ff;color:#4338ca;
                display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;
                flex-shrink:0;
              `;
              avatarPlaceholder.textContent = opt.label.charAt(0).toUpperCase();
              itemEl.appendChild(avatarPlaceholder);
            }

            const info = document.createElement("div");
            info.style.cssText = "flex:1;min-width:0;";
            const name = document.createElement("div");
            name.style.cssText = "font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
            if (opts.highlightMatch) {
              name.innerHTML = highlightMatch(opt.label, query);
            } else {
              name.textContent = opt.label;
            }
            info.appendChild(name);

            if (opt.description) {
              const desc = document.createElement("div");
              desc.style.cssText = "font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
              desc.textContent = opt.description;
              info.appendChild(desc);
            }
            itemEl.appendChild(info);
          }

          itemEl.setAttribute("role", "option");
          itemEl.dataset.index = String(i);

          if (!opt.disabled) {
            itemEl.addEventListener("click", () => insertMention(opt));
            itemEl.addEventListener("mouseenter", () => {
              selectedIndex = i;
              highlightSelected();
            });
          }

          dropdown.appendChild(itemEl);
        }
      }

      selectedIndex = -1;
      highlightSelected();
    }

    function highlightSelected(): void {
      const items = dropdown.querySelectorAll('[role="option"]');
      items.forEach((item, idx) => {
        (item as HTMLElement).style.background = idx === selectedIndex ? "#f0f4ff" : "";
      });
    }

    function insertMention(option: MentionOption): void {
      if (queryStartPos < 0 || activeTrigger === null) return;

      const pos = el.selectionStart ?? el.value.length;
      const before = el.value.substring(0, queryStartPos);
      const after = el.value.substring(pos);
      const mentionText = `${activeTrigger}${option.label}`;

      el.value = before + mentionText + " " + after;

      // Position cursor after inserted text
      const newPos = before.length + mentionText.length + 1;
      el.setSelectionRange(newPos, newPos);
      closeDropdown();
      opts.onMention?.(option);
      opts.onChange?.(el.value);
    }

    function positionDropdown(): void {
      if (queryStartPos < 0) return;
      const coords = getCaretCoordinates(el, el.selectionStart ?? el.value.length);
      const elRect = el.getBoundingClientRect();

      dropdown.style.top = `${elRect.top + coords.top + 20}px`;
      dropdown.style.left = `${elRect.left + coords.left}px`;
    }

    function openDropdown(): void {
      if (isOpen) return;
      isOpen = true;
      selectedIndex = -1;
      loadOptions(getCurrentQuery());
      dropdown.style.display = "block";
      positionDropdown();
    }

    function closeDropdown(): void {
      isOpen = false;
      activeTrigger = null;
      queryStartPos = -1;
      dropdown.style.display = "none";
      selectedIndex = -1;
    }

    function checkForTrigger(): boolean {
      const pos = el.selectionStart ?? el.value.length;
      const textBefore = el.value.substring(0, pos);

      // Find the nearest trigger character before cursor
      let latestTriggerIdx = -1;
      let latestTriggerChar: string | null = null;

      for (const trigger of opts.triggers) {
        const idx = textBefore.lastIndexOf(trigger);
        if (idx > latestTriggerIdx) {
          latestTriggerIdx = idx;
          latestTriggerChar = trigger;
        }
      }

      if (latestTriggerIdx >= 0) {
        // Check there's no space between trigger and cursor
        const sinceTrigger = textBefore.substring(latestTriggerIdx + 1);
        if (!sinceTrigger.includes(" ") && sinceTrigger.includes("\n")) {
          closeDropdown();
          return false;
        }

        const queryLen = pos - latestTriggerIdx - 1;
        if (queryLen >= opts.minLength) {
          activeTrigger = latestTriggerChar;
          queryStartPos = latestTriggerIdx;
          return true;
        }
      }

      closeDropdown();
      return false;
    }

    // Event handlers
    el.addEventListener("input", () => {
      opts.onChange?.(el.value);

      if (checkForTrigger()) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const q = getCurrentQuery();
          if (isAsyncSource) {
            loadOptions(q);
          } else {
            filterLocal(q);
            renderDropdown();
            dropdown.style.display = "block";
            positionDropdown();
          }
        }, opts.debounceMs);
      }
    });

    el.addEventListener("keydown", (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, filteredOptions.length - 1);
          highlightSelected();
          break;
        case "ArrowUp":
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, 0);
          highlightSelected();
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && filteredOptions[selectedIndex] && !filteredOptions[selectedIndex]!.disabled) {
            insertMention(filteredOptions[selectedIndex]!);
          }
          break;
        case "Escape":
          e.preventDefault();
          closeDropdown();
          break;
        case "Tab":
          e.preventDefault();
          if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
            insertMention(filteredOptions[selectedIndex]!);
          } else {
            closeDropdown();
          }
          break;
      }
    });

    el.addEventListener("blur", () => {
      setTimeout(() => {
        if (document.activeElement !== dropdown && !dropdown.contains(document.activeElement)) {
          closeDropdown();
        }
      }, 150);
    });

    // Click outside
    const clickOutside = (e: MouseEvent) => {
      if (isOpen && el !== e.target as Node && !dropdown.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", clickOutside);

    // Parse mentions from current text
    function getMentions(): Array<{ id: string; label: string; trigger: string; offset: number }> {
      const results: Array<{ id: string; label: string; trigger: string; offset: number }> = [];
      const text = el.value;
      for (const trigger of opts.triggers) {
        const regex = new RegExp(`\\${trigger}(\\S+)`, "g");
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          results.push({
            id: match[1],
            label: match[1],
            trigger,
            offset: match.index,
          });
        }
      }
      return results;
    }

    const instance: MentionInstance = {
      element: el,

      open() { checkForTrigger(); if (activeTrigger) openDropdown(); },
      close() { closeDropdown(); },

      getText() { return el.value; },

      setText(text: string) { el.value = text; },

      getMentions,

      destroy() {
        destroyed = true;
        if (debounceTimer) clearTimeout(debounceTimer);
        document.removeEventListener("mousedown", clickOutside);
        dropdown.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a mention */
export function createMention(options: MentionOptions): MentionInstance {
  return new MentionManager().create(options);
}
