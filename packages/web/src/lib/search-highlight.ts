/**
 * Search Highlight: Text search with highlighted matches, match count,
 * navigate between matches (prev/next), case-sensitive toggle, whole-word
 * mode, and accessible search UI.
 */

// --- Types ---

export interface SearchHighlightOptions {
  /** Container element or selector (the element to search within) */
  container: HTMLElement | string;
  /** Search input element or selector (optional, auto-creates if not provided) */
  searchInput?: HTMLInputElement | string;
  /** Show search toolbar? */
  showToolbar?: boolean;
  /** Highlight color */
  highlightColor?: string;
  /** Highlight text color */
  highlightTextColor?: string;
  /** Case sensitive by default? */
  caseSensitive?: boolean;
  /** Whole word match by default? */
  wholeWord?: boolean;
  /** Use regex? */
  useRegex?: boolean;
  /** Auto-scroll to first match on search? */
  autoScroll?: boolean;
  /** Callback on search (match count) */
  onSearch?: (query: string, matchCount: number) => void;
  /** Callback on match navigate */
  onNavigate?: (index: number, matchEl: HTMLElement) => void;
  /** Custom CSS class for the toolbar */
  className?: string;
}

export interface SearchHighlightInstance {
  element: HTMLElement;
  getQuery: () => string;
  setQuery: (query: string) => void;
  getMatchCount: () => number;
  getCurrentMatchIndex: () => number;
  goToMatch: (index: number) => void;
  nextMatch: () => void;
  prevMatch: () => void;
  clearHighlights: () => void;
  setCaseSensitive: (value: boolean) => void;
  setWholeWord: (value: boolean) => void;
  destroy: () => void;
}

// --- Main Class ---

export class SearchHighlightManager {
  create(options: SearchHighlightOptions): SearchHighlightInstance {
    const opts = {
      showToolbar: options.showToolbar ?? true,
      highlightColor: options.highlightColor ?? "#fef08a",
      highlightTextColor: options.highlightTextColor ?? "inherit",
      caseSensitive: options.caseSensitive ?? false,
      wholeWord: options.wholeWord ?? false,
      useRegex: options.useRegex ?? false,
      autoScroll: options.autoScroll ?? true,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("SearchHighlight: container not found");

    // Save original HTML content
    const originalHTML = container.innerHTML;

    let currentQuery = "";
    let currentMatchIndex = -1;
    let matchElements: HTMLElement[] = [];
    let destroyed = false;

    // Create or find search input
    let searchInputEl: HTMLInputElement;
    if (options.searchInput) {
      searchInputEl = typeof options.searchInput === "string"
        ? document.querySelector<HTMLInputElement>(options.searchInput)!
        : options.searchInput;
    } else {
      searchInputEl = document.createElement("input");
      searchInputEl.type = "text";
      searchInputEl.placeholder = "Search...";
      searchInputEl.style.cssText = `
        padding:6px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;
        outline:none;width:200px;transition:border-color 0.15s;
      `;
      searchInputEl.addEventListener("focus", () => { searchInputEl.style.borderColor = "#4338ca"; });
      searchInputEl.addEventListener("blur", () => { searchInputEl.style.borderColor = "#d1d5db"; });
    }

    function render(): void {
      // Remove existing toolbar
      const existingToolbar = container.parentElement?.querySelector(".sh-toolbar");
      existingToolbar?.remove();

      if (!opts.showToolbar && !options.searchInput) return;

      // Create toolbar
      if (opts.showToolbar) {
        const toolbar = document.createElement("div");
        toolbar.className = `sh-toolbar ${opts.className ?? ""}`;
        toolbar.style.cssText = `
          display:flex;align-items:center;gap:8px;padding:8px 0;flex-wrap:wrap;
        `;

        // Search input
        const inputWrapper = document.createElement("div");
        inputWrapper.style.cssText = "position:relative;display:flex;align-items:center;";
        inputWrapper.appendChild(searchInputEl);
        toolbar.appendChild(inputWrapper);

        // Match count
        const countEl = document.createElement("span");
        countEl.className = "sh-match-count";
        countEl.style.cssText = "font-size:12px;color:#6b7280;min-width:60px;";
        updateCountDisplay(countEl);

        // Navigation buttons
        const navGroup = document.createElement("div");
        navGroup.style.cssText = "display:flex;align-items:center;gap:2px;";

        const prevBtn = createNavBtn("\u25C0", "Previous match", () => instance.prevMatch());
        const nextBtn = createNavBtn("\u25B6", "Next match", () => instance.nextMatch());
        navGroup.append(prevBtn, nextBtn);
        toolbar.appendChild(navGroup);
        toolbar.appendChild(countEl);

        // Options toggles
        const toggleGroup = document.createElement("div");
        toggleGroup.style.cssText = "display:flex;align-items:center;gap:4px;margin-left:auto;";

        // Case sensitive
        const caseToggle = createToggle("Aa", "Case sensitive", opts.caseSensitive, (v) => {
          opts.caseSensitive = v;
          doSearch();
        });
        toggleGroup.appendChild(caseToggle);

        // Whole word
        const wordToggle = createToggle("W", "Whole word", opts.wholeWord, (v) => {
          opts.wholeWord = v;
          doSearch();
        });
        toggleGroup.appendChild(wordToggle);

        // Clear button
        const clearBtn = document.createElement("button");
        clearBtn.type = "button";
        clearBtn.innerHTML = "\u2715";
        clearBtn.title = "Clear highlights";
        clearBtn.style.cssText = `
          background:none;border:none;font-size:12px;color:#9ca3af;cursor:pointer;
          padding:3px 6px;border-radius:4px;
        `;
        clearBtn.addEventListener("click", () => { instance.clearHighlights(); searchInputEl.value = ""; });
        clearBtn.addEventListener("mouseenter", () => { clearBtn.style.color = "#ef4444"; });
        clearBtn.addEventListener("mouseleave", () => { clearBtn.style.color = "#9ca3af"; });
        toggleGroup.appendChild(clearBtn);

        toolbar.appendChild(toggleGroup);

        // Insert before container
        container.parentNode?.insertBefore(toolbar, container);

        // Store refs
        (container as any)._shCountEl = countEl;
        (container as any)._shPrevBtn = prevBtn;
        (container as any)._shNextBtn = nextBtn;
      }

      // Bind input event
      // Remove old listener to avoid duplicates
      const oldInput = (searchInputEl as any)._shListener;
      if (oldInput) searchInputEl.removeEventListener("input", oldInput);

      const listener = () => {
        currentQuery = searchInputEl.value;
        doSearch();
      };
      searchInputEl.addEventListener("input", listener);
      (searchInputEl as any)._shListener = listener;

      // Keyboard shortcuts within container
      const keyHandler = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "f") {
          e.preventDefault();
          searchInputEl.focus();
          searchInputEl.select();
        }
        if (e.key === "F3" || (e.key === "Enter" && document.activeElement === searchInputEl)) {
          e.preventDefault();
          if (e.shiftKey) instance.prevMatch();
          else instance.nextMatch();
        }
        if (e.key === "Escape") {
          instance.clearHighlights();
          searchInputEl.value = "";
          searchInputEl.blur();
        }
      };

      container.addEventListener("keydown", keyHandler);
      (container as any)._shKeyHandler = keyHandler;
    }

    function doSearch(): void {
      // Clear previous highlights
      clearInternalHighlights();

      currentQuery = searchInputEl.value.trim();
      if (!currentQuery) {
        matchElements = [];
        currentMatchIndex = -1;
        updateCountDisplay((container as any)._shCountEl);
        opts.onSearch?.("", 0);
        return;
      }

      try {
        // Restore original content first
        container.innerHTML = originalHTML;

        // Build regex
        let pattern: RegExp;
        if (opts.useRegex) {
          pattern = new RegExp(currentQuery, `g${opts.caseSensitive ? "" : "i"}`);
        } else {
          let escaped = currentQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          if (opts.wholeWord) {
            escaped = `\\b${escaped}\\b`;
          }
          pattern = new RegExp(escaped, `g${opts.caseSensitive ? "" : "i"}`);
        }

        // Walk text nodes and wrap matches
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
        const textNodes: Text[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) {
          if (node.textContent!.trim()) textNodes.push(node as Text);
        }

        matchElements = [];

        for (const textNode of textNodes) {
          const content = textNode.textContent!;
          let match: RegExpExecArray | null;
          pattern.lastIndex = 0;

          // Reset lastIndex and find all matches
          const tempPattern = new RegExp(pattern.source, pattern.flags);
          const matches: Array<{ index: number; length: number }> = [];
          while ((match = tempPattern.exec(content)) !== null) {
            if (match[0].length > 0) {
              matches.push({ index: match.index!, length: match[0].length });
            }
          }

          if (matches.length === 0) continue;

          // Replace text node with fragment containing highlighted spans
          const frag = document.createDocumentFragment();
          let lastEnd = 0;

          for (const m of matches) {
            // Before match text
            if (m.index > lastEnd) {
              frag.appendChild(document.createTextNode(content.slice(lastEnd, m.index)));
            }

            // Highlighted span
            const span = document.createElement("mark");
            span.className = "sh-match";
            span.dataset.matchIndex = String(matchElements.length);
            span.style.cssText = `
              background:${opts.highlightColor};color:${opts.highlightTextColor};
              border-radius:2px;padding:0 1px;
            `;
            span.textContent = content.slice(m.index, m.index + m.length);
            frag.appendChild(span);
            matchElements.push(span);

            lastEnd = m.index + m.length;
          }

          // Remaining text after last match
          if (lastEnd < content.length) {
            frag.appendChild(document.createTextNode(content.slice(lastEnd)));
          }

          textNode.parentNode?.replaceChild(frag, textNode);
        }

        opts.onSearch?.(currentQuery, matchElements.length);

        if (matchElements.length > 0 && opts.autoScroll) {
          currentMatchIndex = 0;
          scrollToMatch(0);
        } else {
          currentMatchIndex = -1;
        }

        updateCountDisplay((container as any)._shCountEl);
        updateNavButtons();
      } catch (err) {
        // Invalid regex or other error
        matchElements = [];
        currentMatchIndex = -1;
        opts.onSearch?.(currentQuery, 0);
      }
    }

    function clearInternalHighlights(): void {
      // Remove mark elements but preserve their text content
      const marks = container.querySelectorAll<HTMLElement>("mark.sh-match");
      for (const mark of marks) {
        const parent = mark.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(mark.textContent!), mark);
          parent.normalize(); // Merge adjacent text nodes
        }
      }
      matchElements = [];
      currentMatchIndex = -1;
    }

    function scrollToMatch(index: number): void {
      const el = matchElements[index];
      if (!el) return;

      // Remove active style from previous
      matchElements.forEach((m) => {
        m.style.outline = "";
        m.style.outlineOffset = "";
      });

      // Style active match
      el.style.outline = "2px solid #4338ca";
      el.style.outlineOffset = "2px";

      el.scrollIntoView({ behavior: "smooth", block: "center" });

      opts.onNavigate?.(index, el);
    }

    function updateCountDisplay(el: HTMLElement | undefined): void {
      if (!el) return;
      if (matchElements.length === 0 && !currentQuery) {
        el.textContent = "";
      } else if (matchElements.length === 0) {
        el.textContent = "No results";
        el.style.color = "#9ca3af";
      } else {
        el.textContent = `${currentMatchIndex + 1} / ${matchElements.length}`;
        el.style.color = "#374151";
      }
    }

    function updateNavButtons(): void {
      const prev = (container as any)._shPrevBtn as HTMLButtonElement;
      const next = (container as any)._shNextBtn as HTMLButtonElement;
      if (prev) prev.disabled = matchElements.length <= 1;
      if (next) next.disabled = matchElements.length <= 1;
    }

    function createNavBtn(label: string, title: string, onClick: () => void): HTMLButtonElement {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.title = title;
      btn.disabled = true;
      btn.style.cssText = `
        width:28px;height:28px;border:1px solid #d1d5db;border-radius:4px;
        background:#fff;color:#374151;font-size:12px;cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        transition:all 0.15s;
      `;
      btn.addEventListener("click", onClick);
      btn.addEventListener("mouseenter", () => { if (!btn.disabled) { btn.style.borderColor = "#4338ca"; btn.style.color = "#4338ca"; } });
      btn.addEventListener("mouseleave", () => { if (!btn.disabled) { btn.style.borderColor = "#d1d5db"; btn.style.color = "#374151"; } });
      return btn;
    }

    function createToggle(label: string, title: string, active: boolean, onChange: (v: boolean) => void): HTMLButtonElement {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.title = title;
      btn.style.cssText = `
        width:26px;height:26px;border:1px solid ${active ? "#4338ca" : "#d1d5db"};border-radius:4px;
        background:${active ? "#eef2ff" : "#fff"};color:${active ? "#4338ca" : "#6b7280"};
        font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;
        justify-content:center;transition:all 0.15s;
      `;
      btn.addEventListener("click", () => {
        active = !active;
        onChange(active);
        btn.style.borderColor = active ? "#4338ca" : "#d1d5db";
        btn.style.background = active ? "#eef2ff" : "#fff";
        btn.style.color = active ? "#4338ca" : "#6b7280";
      });
      return btn;
    }

    // Initial setup
    render();

    const instance: SearchHighlightInstance = {
      element: container,

      getQuery() { return currentQuery; },

      setQuery(query: string) {
        searchInputEl.value = query;
        doSearch();
      },

      getMatchCount() { return matchElements.length; },

      getCurrentMatchIndex() { return currentMatchIndex; },

      goToMatch(index: number) {
        if (index >= 0 && index < matchElements.length) {
          currentMatchIndex = index;
          scrollToMatch(index);
          updateCountDisplay((container as any)._shCountEl);
        }
      },

      nextMatch() {
        if (matchElements.length === 0) return;
        currentMatchIndex = (currentMatchIndex + 1) % matchElements.length;
        scrollToMatch(currentMatchIndex);
        updateCountDisplay((container as any)._shCountEl);
      },

      prevMatch() {
        if (matchElements.length === 0) return;
        currentMatchIndex = (currentMatchIndex - 1 + matchElements.length) % matchElements.length;
        scrollToMatch(currentMatchIndex);
        updateCountDisplay((container as any)._shCountEl);
      },

      clearHighlights() {
        clearInternalHighlights();
        container.innerHTML = originalHTML;
        currentQuery = "";
        currentMatchIndex = -1;
        updateCountDisplay((container as any)._shCountEl);
        opts.onSearch?.("", 0);
      },

      setCaseSensitive(v: boolean) {
        opts.caseSensitive = v;
        if (currentQuery) doSearch();
      },

      setWholeWord(v: boolean) {
        opts.wholeWord = v;
        if (currentQuery) doSearch();
      },

      destroy() {
        destroyed = true;
        instance.clearHighlights();
        const kh = (container as any)._shKeyHandler;
        if (kh) container.removeEventListener("keydown", kh);
        const il = (searchInputEl as any)._shListener;
        if (il) searchInputEl.removeEventListener("input", il);
        const tb = container.parentElement?.querySelector(".sh-toolbar");
        tb?.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a search highlight */
export function createSearchHighlight(options: SearchHighlightOptions): SearchHighlightInstance {
  return new SearchHighlightManager().create(options);
}
