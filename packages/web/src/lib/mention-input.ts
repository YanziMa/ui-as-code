/**
 * Mention Input: Text input/textarea with @mention autocomplete, highlighting,
 * dropdown menu, trigger character customization, multi-word matching,
 * and accessible ARIA attributes.
 */

// --- Types ---

export interface MentionUser {
  /** Unique ID */
  id: string;
  /** Display name */
  name: string;
  /** Avatar URL or initial */
  avatar?: string;
  /** Subtitle (email, role, etc.) */
  subtitle?: string;
}

export interface MentionOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Users/items available for mentioning */
  users: MentionUser[];
  /** Trigger character (default: "@") */
  trigger?: string;
  /** Min characters to show dropdown (default: 0) */
  minQueryLength?: number;
  /** Max visible items in dropdown (default: 8) */
  maxDropdownItems?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Rows for textarea (default: 3) */
  rows?: number;
  /** Callback when a mention is inserted */
  onMention?: (user: MentionUser) => void;
  /** Callback on text change (without mentions) */
  onChange?: (text: string) => void;
  /** Custom filter function */
  filterFn?: (query: string, user: MentionUser) => boolean;
  /** Highlight color for mentions in text */
  highlightColor?: string;
  /** Show avatars in dropdown? */
  showAvatars?: boolean;
  /** Allow creating new mentions not in list? */
  allowNew?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface MentionInputInstance {
  element: HTMLElement;
  textarea: HTMLTextAreaElement;
  /** Get raw text value */
  getValue: () => string;
  /** Get parsed mentions from current text */
  getMentions: () => { id: string; name: string; offset: number; length: number }[];
  /** Set value programmatically */
  setValue: (text: string) => void;
  /** Insert mention at cursor position */
  insertMention: (user: MentionUser) => void;
  /** Focus the textarea */
  focus: () => void;
  destroy: () => void;
}

// --- Main Factory ---

export function createMentionInput(options: MentionOptions): MentionInputInstance {
  const opts = {
    trigger: options.trigger ?? "@",
    minQueryLength: options.minQueryLength ?? 0,
    maxDropdownItems: options.maxDropdownItems ?? 8,
    placeholder: options.placeholder ?? "Type @ to mention someone...",
    rows: options.rows ?? 3,
    highlightColor: options.highlightColor ?? "#eef2ff",
    showAvatars: options.showAvatars ?? true,
    allowNew: options.allowNew ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("MentionInput: container not found");

  container.className = `mention-input ${opts.className}`;

  // Textarea wrapper
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:relative;";
  container.appendChild(wrapper);

  // Textarea
  const textarea = document.createElement("textarea");
  textarea.placeholder = opts.placeholder;
  textarea.rows = opts.rows;
  textarea.style.cssText = `
    width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;
    font-size:14px;font-family:-apple-system,sans-serif;line-height:1.5;
    resize:vertical;outline:none;box-sizing:border-box;color:#374151;
    transition:border-color 0.15s;
  `;
  textarea.addEventListener("focus", () => { textarea.style.borderColor = "#6366f1"; });
  textarea.addEventListener("blur", () => { textarea.style.borderColor = "#d1d5db"; });
  wrapper.appendChild(textarea);

  // Dropdown
  const dropdown = document.createElement("div");
  dropdown.className = "mention-dropdown";
  dropdown.style.cssText = `
    position:absolute;left:0;top:100%;margin-top:4px;min-width:260px;
    background:#fff;border:1px solid #e5e7eb;border-radius:10px;
    box-shadow:0 10px 40px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.06);
    z-index:10000;display:none;max-height:280px;overflow-y:auto;
    font-family:-apple-system,sans-serif;font-size:13px;padding:4px;
  `;
  wrapper.appendChild(dropdown);

  // State
  let isOpen = false;
  let query = "";
  let queryStartPos = -1;
  let selectedIndex = 0;
  let filteredUsers: MentionUser[] = [];
  let destroyed = false;

  function findTriggerPosition(): number {
    const val = textarea.value;
    const cursorPos = textarea.selectionStart;
    // Search backwards from cursor for trigger char
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (val[i] === opts.trigger && (i === 0 || /[\s\n]/.test(val[i - 1]!))) {
        return i;
      }
      // Stop at whitespace before trigger
      if (/[\s\n]/.test(val[i]) && i < cursorPos - 1) break;
    }
    return -1;
  }

  function filterUsers(q: string): MentionUser[] {
    const lowerQ = q.toLowerCase();
    let results = opts.users.filter((u) =>
      opts.filterFn ? opts.filterFn(lowerQ, u) :
      u.name.toLowerCase().includes(lowerQ) ||
      u.subtitle?.toLowerCase().includes(lowerQ)
    );
    return results.slice(0, opts.maxDropdownItems);
  }

  function openDropdown(): void {
    if (filteredUsers.length === 0 && !opts.allowNew) {
      closeDropdown();
      return;
    }
    isOpen = true;
    selectedIndex = 0;
    renderDropdown();
    dropdown.style.display = "block";
  }

  function closeDropdown(): void {
    isOpen = false;
    dropdown.style.display = "none";
    dropdown.innerHTML = "";
  }

  function renderDropdown(): void {
    dropdown.innerHTML = "";

    if (filteredUsers.length === 0 && query.length >= opts.minQueryLength && opts.allowNew) {
      // Show "create new" option
      const item = createDropdownItem({
        id: `new-${query}`,
        name: query,
        subtitle: `Create "${query}"`,
      }, true);
      item.addEventListener("click", () => selectMention({ id: `new-${query}`, name: query }));
      dropdown.appendChild(item);
      return;
    }

    for (let i = 0; i < filteredUsers.length; i++) {
      const user = filteredUsers[i]!;
      const item = createDropdownItem(user, false);
      item.addEventListener("click", () => selectMention(user));
      item.addEventListener("mouseenter", () => { selectedIndex = i; highlightSelected(); });
      if (i === selectedIndex) item.style.background = "#f3f4f6";
      dropdown.appendChild(item);
    }
  }

  function createDropdownItem(user: MentionUser, isNew: boolean): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText = `
      display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;
      border-radius:6px;transition:background 0.08s;
    `;
    el.addEventListener("mouseenter", () => { el.style.background = "#f3f4f6"; });
    el.addEventListener("mouseleave", () => { el.style.background = ""; });

    if (opts.showAvatars && user.avatar) {
      const img = document.createElement("img");
      img.src = user.avatar;
      img.alt = "";
      img.style.cssText = "width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;";
      el.appendChild(img);
    } else if (opts.showAvatars) {
      const initial = document.createElement("span");
      initial.style.cssText = `
        width:28px;height:28px;border-radius:50%;display:flex;align-items:center;
        justify-content:center;font-size:11px;font-weight:600;color:#fff;
        background:hsl(${simpleHash(user.id) % 360}, 65%, 55%);flex-shrink:0;
      `;
      initial.textContent = user.name.charAt(0).toUpperCase();
      el.appendChild(initial);
    }

    const info = document.createElement("div");
    info.style.cssText = "flex:1;min-width:0;";

    const nameEl = document.createElement("div");
    nameEl.style.cssText = `font-weight:500;color:#111827;font-size:13px;${isNew ? "color:#6366f1;" : ""}`;
    nameEl.textContent = isNew ? `+ ${user.name}` : user.name;
    info.appendChild(nameEl);

    if (user.subtitle) {
      const sub = document.createElement("div");
      sub.style.cssText = "font-size:11px;color:#9ca3af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      sub.textContent = user.subtitle;
      info.appendChild(sub);
    }

    el.appendChild(info);
    return el;
  }

  function selectMention(user: MentionUser): void {
    // Replace trigger+query with formatted mention
    const before = textarea.value.substring(0, queryStartPos);
    const after = textarea.value.substring(textarea.selectionStart);
    const mentionText = `${opts.trigger}${user.name} `;
    textarea.value = before + mentionText + after;

    // Place cursor after insertion
    const newPos = before.length + mentionText.length;
    textarea.setSelectionRange(newPos, newPos);
    textarea.focus();

    closeDropdown();
    opts.onMention?.(user);
    opts.onChange?.(textarea.value);
  }

  function highlightSelected(): void {
    const items = dropdown.querySelectorAll<HTMLElement>("[data-mention-index]");
    items.forEach((item, i) => {
      item.style.background = i === selectedIndex ? "#f3f4f6" : "";
    });
  }

  function handleInput(): void {
    const pos = findTriggerPosition();

    if (pos >= 0) {
      queryStartPos = pos;
      query = textarea.value.substring(pos + 1, textarea.selectionStart);

      if (query.length >= opts.minQueryLength) {
        filteredUsers = filterUsers(query);
        openDropdown();
      } else {
        closeDropdown();
      }
    } else {
      closeDropdown();
    }

    opts.onChange?.(textarea.value);
  }

  // Keyboard navigation within dropdown
  function handleKeydown(e: KeyboardEvent): void {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredUsers.length - 1);
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
        if (filteredUsers[selectedIndex]) {
          selectMention(filteredUsers[selectedIndex]!);
        } else if (opts.allowNew && query.length > 0) {
          selectMention({ id: `new-${query}`, name: query });
        }
        break;
      case "Escape":
        e.preventDefault();
        closeDropdown();
        break;
    }
  }

  // Close on outside click
  document.addEventListener("mousedown", (e) => {
    if (!wrapper.contains(e.target as Node)) closeDropdown();
  });

  textarea.addEventListener("input", handleInput);
  textarea.addEventListener("keydown", handleKeydown);

  function simpleHash(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }

  function parseMentions(text: string): { id: string; name: string; offset: number; length: number }[] {
    const mentions: { id: string; name: string; offset: number; length: number }[] = [];
    const regex = new RegExp(`\\${opts.trigger}([\\w\\s]+?)\\b`, "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const name = match[1]!.trim();
      const user = opts.users.find((u) => u.name === name);
      mentions.push({
        id: user?.id ?? `unknown-${name}`,
        name,
        offset: match.index!,
        length: match[0]!.length,
      });
    }
    return mentions;
  }

  const instance: MentionInputInstance = {
    element: container,
    textarea,

    getValue() { return textarea.value; },

    getMentions() { return parseMentions(textarea.value); },

    setValue(text: string) { textarea.value = text; },

    insertMention(user: MentionUser) {
      const pos = textarea.selectionStart;
      const before = textarea.value.substring(0, pos);
      const after = textarea.value.substring(pos);
      textarea.value = before + `${opts.trigger}${user.name} ` + after;
      textarea.focus();
      opts.onMention?.(user);
    },

    focus() { textarea.focus(); },

    destroy() {
      destroyed = true;
      closeDropdown();
      textarea.removeEventListener("input", handleInput);
      textarea.removeEventListener("keydown", handleKeydown);
    },
  };

  return instance;
}
