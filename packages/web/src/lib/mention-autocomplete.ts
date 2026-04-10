/**
 * Mention Autocomplete: Text input/textarea with @mention autocomplete dropdown,
 * highlighting mentions in text, keyboard navigation, custom mention sources,
 * and trigger character configuration.
 */

// --- Types ---

export interface MentionItem {
  /** Display name */
  name: string;
  /** Unique identifier (e.g., user ID) */
  id: string;
  /** Avatar URL or initials fallback */
  avatar?: string;
  /** Subtitle/hint text */
  subtitle?: string;
  /** Custom data */
  data?: unknown;
}

export interface MentionAutocompleteOptions {
  /** Input element (textarea or input) */
  input: HTMLTextAreaElement | HTMLInputElement;
  /** Source of mentionable items (static array or async search function) */
  items: MentionItem[] | ((query: string) => Promise<MentionItem[]>);
  /** Trigger character(s) (default: ["@"]) */
  triggers?: string[];
  /** Max items shown in dropdown (default: 8) */
  maxItems?: number;
  /** Minimum characters to trigger search (default: 0) */
  minChars?: number;
  /** Show avatars in dropdown? */
  showAvatars?: boolean;
  /** Highlight color for mentions in text (default: "#eef2ff") */
  highlightColor?: string;
  /** Highlight text color (default: "#4338ca") */
  highlightTextColor?: string;
  /** Dropdown z-index (default: 10500) */
  zIndex?: number;
  /** Callback when a mention is selected */
  onMention?: (item: MentionItem) => void;
  /** Callback on text change (with parsed mentions) */
  onChange?: (text: string, mentions: MentionItem[]) => void;
  /** Custom filter function */
  filterFn?: (item: MentionItem, query: string) => boolean;
  /** Custom CSS class for dropdown */
  className?: string;
}

export interface MentionAutocompleteInstance {
  /** The input element */
  inputEl: HTMLTextAreaElement | HTMLInputElement;
  /** Get currently detected mentions from text */
  getMentions: () => { item: MentionItem; offset: number; length: number }[];
  /** Get raw text (without highlighting markup) */
  getText: () => string;
  /** Set text programmatically */
  setText: (text: string) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function defaultFilter(item: MentionItem, query: string): boolean {
  const q = query.toLowerCase();
  return item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
}

function getCaretCoordinates(input: HTMLElement): { top: number; left: number } {
  const div = document.createElement("div");
  div.style.cssText = "position:absolute;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;";
  const style = getComputedStyle(input);
  ["fontSize","fontFamily","fontWeight","letterSpacing","textTransform","border","padding","boxSizing","width"].forEach((prop) => {
    div.style[prop as any] = (style as any)[prop];
  });
  document.body.appendChild(div);

  if (input instanceof HTMLTextAreaElement) {
    div.textContent = input.value.substring(0, input.selectionStart);
  } else {
    div.textContent = input.value.substring(0, (input as any).selectionStart ?? input.value.length);
  }

  const coords = { top: div.offsetTop + input.offsetTop, left: div.offsetLeft + input.offsetLeft };
  div.remove();
  return coords;
}

// --- Main ---

export function createMentionAutocomplete(options: MentionAutocompleteOptions): MentionAutocompleteInstance {
  const opts = {
    triggers: options.triggers ?? ["@"],
    maxItems: options.maxItems ?? 8,
    minChars: options.minChars ?? 0,
    showAvatars: options.showAvatars ?? true,
    highlightColor: options.highlightColor ?? "#eef2ff",
    highlightTextColor: options.highlightTextColor ?? "#4338fa",
    zIndex: options.zIndex ?? 10500,
    filterFn: options.filterFn ?? defaultFilter,
    className: options.className ?? "",
    ...options,
  };

  const input = options.input;

  // Create dropdown
  const dropdown = document.createElement("div");
  dropdown.className = `mention-dropdown ${opts.className}`;
  dropdown.style.cssText = `
    position:absolute;display:none;z-index:${opts.zIndex};
    background:#fff;border:1px solid #e5e7eb;border-radius:8px;
    box-shadow:0 8px 30px rgba(0,0,0,0.12);min-width:220px;max-height:240px;
    overflow-y:auto;padding:4px 0;font-family:-apple-system,sans-serif;font-size:13px;
  `;
  document.body.appendChild(dropdown);

  let isOpen = false;
  let selectedIndex = -1;
  let currentTrigger: string | null = null;
  let queryStart = -1;
  let filteredItems: MentionItem[] = [];
  let destroyed = false;

  const isAsyncSource = typeof options.items === "function";

  function closeDropdown(): void {
    isOpen = false;
    dropdown.style.display = "none";
    selectedIndex = -1;
    currentTrigger = null;
    queryStart = -1;
  }

  function showDropdown(x: number, y: number): void {
    isOpen = true;
    dropdown.style.left = `${x}px`;
    dropdown.style.top = `${y}px`;
    dropdown.style.display = "block";
    selectedIndex = -1;
  }

  function renderDropdown(): void {
    dropdown.innerHTML = "";

    if (filteredItems.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "padding:12px;text-align:center;color:#9ca3af;font-size:12px;";
      empty.textContent = "No results";
      dropdown.appendChild(empty);
      return;
    }

    for (let i = 0; i < Math.min(filteredItems.length, opts.maxItems); i++) {
      const item = filteredItems[i]!;
      const itemEl = document.createElement("div");
      itemEl.dataset.index = String(i);
      itemEl.style.cssText = `
        display:flex;align-items:center;gap:8px;padding:7px 14px;cursor:pointer;
        ${i === selectedIndex ? "background:#f0f4ff;" : ""}
        transition:background 0.1s;
      `;

      // Avatar
      if (opts.showAvatars) {
        const av = document.createElement("span");
        av.style.cssText = `
          width:24px;height:24px;border-radius:50%;flex-shrink:0;display:flex;
          align-items:center;justify-content:center;font-size:10px;font-weight:600;
          background:#e2e8f0;color:#64748b;overflow:hidden;
        `;
        if (item.avatar && /^https?:\/|^data:image/.test(item.avatar)) {
          const img = document.createElement("img");
          img.src = item.avatar;
          img.style.cssText = "width:100%;height:100%;object-fit:cover;";
          av.innerHTML = "";
          av.appendChild(img);
        } else {
          av.textContent = item.name.split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
        }
        itemEl.appendChild(av);
      }

      // Name + subtitle
      const textCol = document.createElement("div");
      textCol.style.cssText = "flex:1;min-width:0;";
      const nameSpan = document.createElement("div");
      nameSpan.style.cssText = "font-weight:500;color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      nameSpan.textContent = item.name;
      textCol.appendChild(nameSpan);
      if (item.subtitle) {
        const sub = document.createElement("div");
        sub.style.cssText = "font-size:11px;color:#9ca3af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
        sub.textContent = item.subtitle;
        textCol.appendChild(sub);
      }
      itemEl.appendChild(textCol);

      itemEl.addEventListener("click", () => selectItem(i));
      itemEl.addEventListener("mouseenter", () => {
        selectedIndex = i;
        highlightSelected();
      });

      dropdown.appendChild(itemEl);
    }
  }

  function highlightSelected(): void {
    const items = dropdown.querySelectorAll("[data-index]");
    items.forEach((el, idx) => {
      (el as HTMLElement).style.background = idx === selectedIndex ? "#f0f4ff" : "";
    });
  }

  async function searchAndShow(query: string): Promise<void> {
    if (isAsyncSource) {
      filteredItems = await (options.items as (q: string) => Promise<MentionItem[]>)(query);
    } else {
      const allItems = options.items as MentionItem[];
      filteredItems = query.length >= opts.minChars
        ? allItems.filter((item) => opts.filterFn!(item, query))
        : [];
    }
    filteredItems = filteredItems.slice(0, opts.maxItems);
    renderDropdown();
  }

  function selectItem(index: number): void {
    if (index < 0 || index >= filteredItems.length) return;
    const item = filteredItems[index]!;

    // Replace the trigger+query with the mention
    const before = input.value.substring(0, queryStart);
    const after = input.value.substring(input.selectionStart ?? input.value.length);
    const insertText = `${currentTrigger}${item.name} `;
    input.value = before + insertText + after;

    // Set cursor position after the inserted text
    const newPos = before.length + insertText.length;
    input.setSelectionRange(newPos, newPos);

    closeDropdown();
    opts.onMention?.(item);
    opts.onChange?.(input.value, instance.getMentions().map((m) => m.item));
    input.focus();
  }

  function checkForTrigger(): void {
    const pos = input.selectionStart ?? input.value.length;
    const textBefore = input.value.substring(0, pos);

    // Find the last trigger character
    let lastTriggerIdx = -1;
    let foundTrigger: string | null = null;

    for (const trig of opts.triggers) {
      const idx = textBefore.lastIndexOf(trig);
      if (idx > lastTriggerIdx) {
        // Make sure it's not inside a word (trigger should be at word boundary or after space/newline)
        const charBefore = textBefore[idx - 1];
        if (idx === 0 || /\s/.test(charBefore ?? "")) {
          lastTriggerIdx = idx;
          foundTrigger = trig;
        }
      }
    }

    if (lastTriggerIdx >= 0 && foundTrigger) {
      const query = textBefore.substring(lastTriggerIdx + foundTrigger!.length);
      if (query.length >= opts.minChars && !query.includes(" ")) {
        currentTrigger = foundTrigger;
        queryStart = lastTriggerIdx;
        const coords = getCaretCoordinates(input);
        showDropdown(coords.left, coords.top + 20);
        searchAndShow(query);
        return;
      }
    }

    closeDropdown();
  }

  // Event listeners
  input.addEventListener("input", () => {
    if (isOpen) checkForTrigger();
    opts.onChange?.(input.value, instance.getMentions().map((m) => m.item));
  });

  input.addEventListener("keydown", (e: KeyboardEvent) => {
    if (!isOpen) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
        highlightSelected();
        break;
      case "ArrowUp":
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        highlightSelected();
        break;
      case "Enter":
      case "Tab":
        e.preventDefault();
        selectItem(selectedIndex >= 0 ? selectedIndex : 0);
        break;
      case "Escape":
        e.preventDefault();
        closeDropdown();
        break;
    }
  });

  input.addEventListener("click", checkForTrigger);
  input.addEventListener("blur", () => {
    setTimeout(closeDropdown, 150); // Delay to allow click on dropdown item
  });

  // Close on outside click
  document.addEventListener("mousedown", (e) => {
    if (isOpen && !dropdown.contains(e.target as Node) && e.target !== input) {
      closeDropdown();
    }
  });

  const instance: MentionAutocompleteInstance = {
    inputEl: input,

    getMentions() {
      const results: { item: MentionItem; offset: number; length: number }[] = [];
      const regex = new RegExp(`(${opts.triggers.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(\\w+(?: \\w+)*)`, "g");
      let match: RegExpExecArray | null;
      while ((match = regex.exec(input.value)) !== null) {
        const name = match[2];
        const allItems = isAsyncSource ? [] : (options.items as MentionItem[]);
        const matchedItem = allItems.find((item) => item.name === name);
        if (matchedItem) {
          results.push({ item: matchedItem, offset: match.index, length: match[0].length });
        }
      }
      return results;
    },

    getText() { return input.value; },

    setText(text: string) {
      input.value = text;
      opts.onChange?.(text, []);
    },

    destroy() {
      destroyed = true;
      dropdown.remove();
    },
  };

  return instance;
}
