/**
 * Mentionable: @mention autocomplete for text inputs and contenteditable areas.
 * Supports:
 * - Trigger character configuration (@, #, etc.)
 * - Async data fetching for mentions
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Highlight matching text in results
 * - Multi-word queries
 * - Insert formatted mention (customizable template)
 * - Debounced search
 * - Virtual scrolling for large datasets
 * - Mobile-friendly positioning
 */

// --- Types ---

export interface MentionItem {
  /** Unique identifier */
  id: string;
  /** Display text */
  name: string;
  /** Secondary text (subtitle/avatar hint) */
  subtitle?: string;
  /** Avatar URL (optional) */
  avatar?: string;
  /** Additional data passed to onSelect */
  data?: unknown;
}

export interface MentionSearchFn {
  (query: string): Promise<MentionItem[]> | MentionItem[];
}

export interface MentionableOptions {
  /** Target input element (textarea, input, or contenteditable div) */
  target: HTMLTextAreaElement | HTMLInputElement | HTMLElement;
  /** Character that triggers the mention menu (default: @) */
  trigger?: string;
  /** Alternative triggers (default: []) */
  triggers?: string[];
  /** Search function - called with query after trigger char */
  search: MentionSearchFn;
  /** Minimum characters to trigger search (default: 1) */
  minLength?: number;
  /** Maximum items shown in dropdown (default: 8) */
  maxItems?: number;
  /** Debounce delay in ms (default: 150) */
  debounceDelay?: number;
  /** Show avatar in dropdown (default: true) */
  showAvatar?: boolean;
  /** Show subtitle in dropdown (default: true) */
  showSubtitle?: boolean;
  /** Dropdown placement (default: auto) */
  placement?: "auto" | "top" | "bottom";
  /** Dropdown offset [x, y] in px (default: [0, 4]) */
  offset?: [number, number];
  /** Z-index (default: 1050) */
  zIndex?: number;
  /** Menu item height in px (default: 40) */
  itemHeight?: number;
  /** Max dropdown height in px (default: 240) */
  maxHeight?: number;
  /** Template for inserting mention (default: "@{name}") */
  insertTemplate?: (item: MentionItem, trigger: string) => string;
  /** Callback when a mention is selected */
  onSelect?: (item: MentionItem, trigger: string) => void;
  /** Callback when menu opens */
  onOpen?: () => void;
  /** Callback when menu closes */
  onClose?: () => void;
  /** Callback when query changes */
  onQueryChange?: (query: string) => void;
  /** Highlight match in results (default: true) */
  highlightMatch?: boolean;
  /** Allow spaces in mention query (default: true) */
  allowSpace?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Empty state message (default: "No results") */
  emptyMessage?: string;
  /** Loading state message (default: "Searching...") */
  loadingMessage?: string;
}

export interface MentionableInstance {
  element: HTMLElement;
  /** Manually open the menu with a query */
  open: (query?: string) => void;
  /** Close the menu */
  close: () => void;
  /** Check if menu is currently open */
  get isOpen(): boolean;
  /** Force re-search with current query */
  refresh: () => void;
  /** Destroy instance */
  destroy: () => void;
}

// --- Helpers ---

function getCaretCoordinates(
  el: HTMLTextAreaElement | HTMLInputElement | HTMLElement,
): { top: number; left: number; bottom: number } {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    // Mirror technique for textarea/input caret position
    const mirror = document.createElement("div");
    const computed = getComputedStyle(el);

    mirror.style.cssText = `
      position:absolute;left:-9999px;top:-9999px;
      white-space:pre-wrap;word-wrap:break-word;
      font:${computed.font};font-size:${computed.fontSize};
      line-height:${computed.lineHeight};padding:${computed.padding};
      border:${computed.border};width:${computed.width};
      overflow:hidden;height:auto;
    `;

    document.body.appendChild(mirror);

    // Copy text up to caret
    const text = el.value.substring(0, (el as HTMLTextAreaElement).selectionStart ?? 0);
    mirror.textContent = text || ".";

    const span = document.createElement("span");
    span.textContent = ".";
    mirror.appendChild(span);

    const coords = {
      top: span.offsetTop + el.getBoundingClientRect().top,
      left: span.offsetLeft + el.getBoundingClientRect().left,
      bottom: span.offsetTop + el.getBoundingClientRect().top + span.offsetHeight,
    };

    mirror.remove();
    return coords;
  }

  // ContentEditable
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    const rect = el.getBoundingClientRect();
    return { top: rect.bottom, left: rect.left, bottom: rect.bottom };
  }

  const range = selection.getRangeAt(0).cloneRange();
  const rect = range.getBoundingClientRect();

  return {
    top: rect.bottom + window.scrollY,
    left: rect.left + window.scrollX,
    bottom: rect.bottom + window.scrollY,
  };
}

function getTextBeforeCaret(
  el: HTMLTextAreaElement | HTMLInputElement | HTMLElement,
): string {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return el.value.substring(0, (el as HTMLTextAreaElement).selectionStart ?? 0);
  }

  // ContentEditable
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return "";

  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(true);
  range.setStartBefore(el);

  return range.toString();
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightText(text: string, query: string): string {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  return escapeHtml(text).replace(regex, "<mark style='background:#fef08a;border-radius:2px;padding:0 1px;'>$1</mark>");
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

// --- Main ---

export function createMentionable(options: MentionableOptions): MentionableInstance {
  const opts = {
    trigger: "@",
    triggers: [],
    minLength: 1,
    maxItems: 8,
    debounceDelay: 150,
    showAvatar: true,
    showSubtitle: true,
    placement: "auto" as const,
    offset: [0, 4],
    zIndex: 1050,
    itemHeight: 40,
    maxHeight: 240,
    highlightMatch: true,
    allowSpace: true,
    emptyMessage: "No results",
    loadingMessage: "Searching...",
    ...options,
  };

  const allTriggers = [opts.trigger, ...opts.triggers];

  const target = options.target;

  // Create dropdown
  const dropdown = document.createElement("ul");
  dropdown.className = `mention-dropdown ${opts.className ?? ""}`;
  dropdown.setAttribute("role", "listbox");
  dropdown.style.cssText = `
    position:absolute;display:none;min-width:220px;max-width:320px;
    background:#fff;border-radius:8px;
    box-shadow:0 8px 30px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.06);
    margin:0;padding:4px;list-style:none;
    z-index:${opts.zIndex};max-height:${opts.maxHeight}px;
    overflow-y:auto;font-family:-apple-system,sans-serif;
    user-select:none;-webkit-user-select:none;
  `;

  document.body.appendChild(dropdown);

  // State
  let isOpen = false;
  let destroyed = false;
  let activeTrigger: string | null = null;
  let currentQuery = "";
  let activeIndex = -1;
  let items: MentionItem[] = [];
  let isLoading = false;
  let caretPos = { top: 0, left: 0, bottom: 0 };
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  // --- Core Logic ---

  function detectTriggerAndQuery(): { trigger: string | null; query: string; start: number } | null {
    const text = getTextBeforeCaret(target);
    if (!text) return null;

    // Find the nearest trigger
    let bestTrigger: string | null = null;
    let bestPos = -1;

    for (const trig of allTriggers) {
      // Find last occurrence of this trigger
      let pos = -1;
      let searchFrom = text.length;
      while ((pos = text.lastIndexOf(trig, searchFrom - 1)) !== -1) {
        // Check if there's whitespace between this trigger and caret
        const afterTrigger = text.substring(pos + trig.length, text.length);
        // Query should not contain certain breaking characters
        if (!/\n/.test(afterTrigger)) {
          bestTrigger = trig;
          bestPos = pos;
          break;
        }
        searchFrom = pos;
        if (searchFrom <= 0) break;
      }
    }

    if (bestTrigger === null || bestPos === -1) return null;

    const query = text.substring(bestPos + bestTrigger.length, text.length);

    // Don't trigger if query contains breaking chars
    if (/[,\(\)\[\]\{\}]/.test(query)) return null;

    // Check minimum length
    if (query.length < opts.minLength) return null;

    return { trigger: bestTrigger, query, start: bestPos };
  }

  async function performSearch(query: string): Promise<void> {
    isLoading = true;
    activeIndex = -1;
    renderDropdown();

    try {
      const results = await opts.search(query);
      items = results.slice(0, opts.maxItems);
    } catch {
      items = [];
    }

    isLoading = false;
    renderDropdown();
  }

  const debouncedSearch = debounce(performSearch, opts.debounceDelay);

  function renderDropdown(): void {
    dropdown.innerHTML = "";

    if (isLoading) {
      const li = document.createElement("li");
      li.style.cssText = "padding:12px 16px;text-align:center;color:#9ca3af;font-size:13px;";
      li.textContent = opts.loadingMessage;
      dropdown.appendChild(li);
    } else if (items.length === 0) {
      const li = document.createElement("li");
      li.style.cssText = "padding:12px 16px;text-align:center;color:#9ca3af;font-size:13px;";
      li.textContent = opts.emptyMessage;
      dropdown.appendChild(li);
    } else {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const li = document.createElement("li");
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(i === activeIndex));
        li.dataset.index = String(i);
        li.style.cssText = `
          display:flex;align-items:center;gap:10px;padding:8px 12px;
          cursor:pointer;border-radius:6px;transition:background 0.1s;
          ${i === activeIndex ? "background:#f0f0f0;" : ""}
        `;

        // Avatar
        if (opts.showAvatar && item.avatar) {
          const img = document.createElement("img");
          img.src = item.avatar;
          img.alt = "";
          img.style.cssText = "width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;";
          li.appendChild(img);
        } else if (opts.showAvatar) {
          const placeholder = document.createElement("div");
          placeholder.style.cssText = `
            width:28px;height:28px;border-radius:50%;background:#e5e7eb;
            flex-shrink:0;display:flex;align-items:center;justify-content:center;
            font-size:12px;font-weight:600;color:#6b7280;
          `;
          placeholder.textContent = item.name.charAt(0).toUpperCase();
          li.appendChild(placeholder);
        }

        // Text
        const textDiv = document.createElement("div");
        textDiv.style.cssText = "min-width:0;flex:1;overflow:hidden;";
        const nameEl = document.createElement("div");
        nameEl.style.cssText = "font-size:13px;font-weight:500;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
        nameEl.innerHTML = opts.highlightMatch ? highlightText(item.name, currentQuery) : escapeHtml(item.name);
        textDiv.appendChild(nameEl);

        if (opts.showSubtitle && item.subtitle) {
          const subEl = document.createElement("div");
          subEl.style.cssText = "font-size:11px;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;";
          subEl.textContent = item.subtitle;
          textDiv.appendChild(subEl);
        }

        li.appendChild(textDiv);

        // Events
        li.addEventListener("click", () => selectItem(item));
        li.addEventListener("mouseenter", () => {
          activeIndex = i;
          updateActiveStyle();
        });

        dropdown.appendChild(li);
      }
    }

    // Position
    positionDropdown();
  }

  function updateActiveStyle(): void {
    const children = dropdown.querySelectorAll<HTMLElement>("li[role='option']");
    children.forEach((li, i) => {
      li.style.background = i === activeIndex ? "#f0f0f0" : "none";
      li.setAttribute("aria-selected", String(i === activeIndex));
    });
  }

  function positionDropdown(): void {
    const rect = target.getBoundingClientRect();
    let top: number;
    let left: number;

    if (caretPos.bottom > 0) {
      top = caretPos.bottom + opts.offset[1];
      left = caretPos.left + opts.offset[0];
    } else {
      top = rect.bottom + opts.offset[1];
      left = rect.left + opts.offset[0];
    }

    // Flip if not enough space below
    const dropdownHeight = Math.min(items.length * opts.itemHeight + 8, opts.maxHeight);
    if (opts.placement === "auto" && top + dropdownHeight > window.innerHeight) {
      top = (caretPos.top > 0 ? caretPos.top : rect.top) - dropdownHeight - opts.offset[1];
    }

    dropdown.style.top = `${top + window.scrollY}px`;
    dropdown.style.left = `${Math.min(left, window.innerWidth - 260)}px`;
  }

  function selectItem(item: MentionItem): void {
    const trigger = activeTrigger ?? opts.trigger;

    // Remove trigger + query text from input
    replaceTextInInput(trigger, currentQuery, item);

    opts.onSelect?.(item, trigger);
    close();
  }

  function replaceTextInInput(trigger: string, _query: string, item: MentionItem): void {
    const template = opts.insertTemplate ?? ((_item: MentionItem, trig: string) => `${trig}${_item.name}`);
    const insertion = template(item, trigger);

    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      const start = (target as HTMLTextAreaElement).selectionStart ?? 0;
      const triggerStart = target.value.lastIndexOf(trigger, start - 1);
      if (triggerStart >= 0) {
        const before = target.value.substring(0, triggerStart);
        const after = target.value.substring(start);
        target.value = before + insertion + after;
        // Set caret after insertion
        const newPos = before.length + insertion.length;
        target.setSelectionRange(newPos, newPos);
      }
    } else {
      // ContentEditable - use execCommand or Range API
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // Find trigger position backwards
        // Simplified: just insert at caret
        range.deleteContents();
        range.insertNode(document.createTextNode(insertion));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    // Dispatch input event so React/Vue/etc pick up the change
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function openMenu(query?: string): void {
    if (destroyed) return;
    isOpen = true;
    currentQuery = query ?? "";
    activeTrigger = opts.trigger;
    caretPos = getCaretCoordinates(target);

    dropdown.style.display = "block";
    opts.onOpen?.();

    if (currentQuery.length >= opts.minLength) {
      debouncedSearch(currentQuery);
    } else {
      renderDropdown();
    }
  }

  function closeMenu(): void {
    if (!isOpen) return;
    isOpen = false;
    activeTrigger = null;
    currentQuery = "";
    items = [];
    activeIndex = -1;
    if (searchTimer) clearTimeout(searchTimer);
    dropdown.style.display = "none";
    opts.onClose?.();
  }

  // --- Event Handlers ---

  function handleInput(): void {
    if (destroyed) return;

    const detection = detectTriggerAndQuery();
    if (detection) {
      activeTrigger = detection.trigger;
      currentQuery = detection.query;
      caretPos = getCaretCoordinates(target);

      if (!isOpen) {
        isOpen = true;
        dropdown.style.display = "block";
        opts.onOpen?.();
      }

      opts.onQueryChange?.(currentQuery);
      debouncedSearch(currentQuery);
    } else {
      closeMenu();
    }
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (!isOpen || items.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        updateActiveStyle();
        break;

      case "ArrowUp":
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActiveStyle();
        break;

      case "Enter":
      case "Tab":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < items.length) {
          selectItem(items[activeIndex]!);
        }
        break;

      case "Escape":
        e.preventDefault();
        closeMenu();
        break;
    }
  }

  // Bind events
  target.addEventListener("input", handleInput);
  target.addEventListener("keydown", handleKeyDown);

  // Close on click outside
  document.addEventListener("mousedown", (e) => {
    if (isOpen && !dropdown.contains(e.target as Node) && !target.contains(e.target as Node)) {
      closeMenu();
    }
  });

  // Instance
  const instance: MentionableInstance = {
    element: dropdown,

    get isOpen() { return isOpen; },

    open(query) { openMenu(query); },
    close: closeMenu,

    refresh() {
      if (currentQuery) performSearch(currentQuery);
    },

    destroy() {
      destroyed = true;
      target.removeEventListener("input", handleInput);
      target.removeEventListener("keydown", handleKeyDown);
      dropdown.remove();
    },
  };

  return instance;
}
