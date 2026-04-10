/**
 * Command Menu / Palette: Fuzzy-searchable command palette with categories,
 * keyboard shortcuts, recent commands, icons, descriptions, and action dispatch.
 * Inspired by VS Code's Command Palette and Raycast.
 */

// --- Types ---

export interface CommandItem {
  id: string;
  label: string;
  /** Description shown below label */
  description?: string;
  /** Category/group header */
  category?: string;
  /** Keyboard shortcut hint */
  shortcut?: string;
  /** Icon (emoji or SVG) */
  icon?: string;
  /** Action to execute on select */
  action: () => void | Promise<void>;
  /** Keywords for fuzzy search (additional to label/description) */
  keywords?: string[];
  /** Disabled? */
  disabled?: boolean;
  /** Danger/destructive command? */
  danger?: boolean;
}

export type CommandCategory = "all" | string;

export interface CommandMenuOptions {
  container: HTMLElement | string;
  commands: CommandItem[];
  /** Placeholder text */
  placeholder?: string;
  /** Max visible results (default: 10) */
  maxResults?: number;
  /** Show recently used commands at top */
  showRecent?: boolean;
  /** Max recent entries (default: 5) */
  maxRecent?: number;
  /** Storage key for recent commands */
  recentKey?: string;
  /** Hotkey to open (e.g., "Ctrl+P", "Cmd+K") */
  hotkey?: string;
  /** Callback when menu opens */
  onOpen?: () => void;
  /** Callback when menu closes */
  onClose?: () => void;
  /** Custom filter/search function */
  customFilter?: (query: string, item: CommandItem) => number; // return score
  /** Group by category? */
  groupByCategory?: boolean;
  /** Show category headers */
  showCategoryHeaders?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Custom CSS class */
  className?: string;
}

export interface CommandMenuInstance {
  element: HTMLElement;
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  setCommands: (commands: CommandItem[]) => void;
  addCommand: (cmd: CommandItem) => void;
  removeCommand: (id: string) => void;
  search: (query: string) => void;
  destroy: () => void;
}

// --- Scoring ---

function fuzzyMatch(query: string, text: string): { score: number; matched: boolean } {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  if (!q) return { score: 0, matched: true };
  if (t.includes(q)) return { score: q.length / t.length + 1, matched: true }; // exact substring

  let qi = 0, ti = 0, score = 0;
  const consecutiveBonus = 0.5;
  const startBonus = 0.3;

  while (qi < q.length && ti < t.length) {
    if (q[qi] === t[ti]) {
      if (qi === 0 && ti === 0) score += startBonus;
      else score += consecutiveBonus;
      score += 1;
      qi++;
    }
    ti++;
  }

  return { score: qi === q.length ? score : -1, matched: qi === q.length };
}

function scoreCommand(query: string, cmd: CommandItem, isRecent: boolean): number {
  const searchText = `${cmd.label} ${cmd.description ?? ""} ${cmd.keywords?.join(" ") ?? ""}`;
  const result = fuzzyMatch(query, searchText);
  if (!result.matched) return -1;
  return result.score + (isRecent ? 2 : 0) + (query.toLowerCase() === cmd.label.toLowerCase() ? 3 : 0);
}

// --- Main Class ---

export class CommandMenuManager {
  create(options: CommandMenuOptions): CommandMenuInstance {
    const opts = {
      placeholder: options.placeholder ?? "Type a command or search...",
      maxResults: options.maxResults ?? 10,
      showRecent: options.showRecent ?? true,
      maxRecent: options.maxRecent ?? 5,
      recentKey: options.recentKey ?? "cmd-recent",
      groupByCategory: options.groupByCategory ?? false,
      showCategoryHeaders: options.showCategoryHeaders ?? true,
      animationDuration: options.animationDuration ?? 150,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("CommandMenu: container not found");

    let commands = [...options.commands];
    let isOpenState = false;
    let currentQuery = "";
    let selectedIndex = 0;
    let destroyed = false;
    let recentIds: string[] = [];

    // Load recent
    if (opts.showRecent) {
      try {
        const saved = localStorage.getItem(opts.recentKey);
        if (saved) recentIds = JSON.parse(saved);
      } catch { /* ignore */ }
    }

    // Overlay
    const overlay = document.createElement("div");
    overlay.className = "cmd-overlay";
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9998;display:none;
      align-items:flex-start;justify-content:center;padding-top:15vh;
    `;

    // Panel
    const panel = document.createElement("div");
    panel.className = "cmd-panel";
    panel.style.cssText = `
      width:560px;max-width:90vw;background:#fff;border-radius:14px;
      box-shadow:0 24px 80px rgba(0,0,0,0.25),0 0 1px rgba(0,0,0,0.1);
      overflow:hidden;font-family:-apple-system,sans-serif;display:none;
      flex-direction:column;max-height:70vh;
    `;

    // Search input area
    const searchArea = document.createElement("div");
    searchArea.style.cssText = `
      display:flex;align-items:center;gap:10px;padding:12px 16px;
      border-bottom:1px solid #e5e7eb;
    `;

    const searchIcon = document.createElement("span");
    searchIcon.innerHTML = "\u{1F50D}";
    searchIcon.style.cssText = "font-size:16px;color:#9ca3af;";
    searchArea.appendChild(searchIcon);

    const input = document.createElement("input");
    input.type = "text";
    input.spellcheck = false;
    input.placeholder = opts.placeholder;
    input.style.cssText = `
      flex:1;border:none;outline:none;font-size:15px;color:#111827;
      background:none;font-family:inherit;
    `;
    searchArea.appendChild(input);

    // Results list
    const resultsList = document.createElement("div");
    resultsList.className = "cmd-results";
    resultsList.style.cssText = "overflow-y:auto;flex:1;padding:6px 0;";
    panel.appendChild(searchArea);
    panel.appendChild(resultsList);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    function renderResults(): void {
      resultsList.innerHTML = "";
      selectedIndex = 0;

      let filtered: Array<{ cmd: CommandItem; score: number; isRecent: boolean }> = [];

      if (currentQuery.trim()) {
        const scored = commands
          .filter((c) => !c.disabled)
          .map((c) => ({ cmd: c, score: scoreCommand(currentQuery.trim(), c, recentIds.includes(c.id)), isRecent: recentIds.includes(c.id) }))
          .filter((s) => s.score >= 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, opts.maxResults);
        filtered = scored;
      } else {
        // No query: show recent first, then all in order
        const recent = recentIds
          .map((id) => commands.find((c) => c.id === id))
          .filter((c): c is CommandItem => !!c && !c.disabled);
        const rest = commands.filter((c) => !c.disabled && !recentIds.includes(c.id));
        filtered = [...recent, ...rest].slice(0, opts.maxResults).map((c) => ({ cmd: c!, score: 0, isRecent: recentIds.includes(c!.id) }));
      }

      if (filtered.length === 0) {
        const empty = document.createElement("div");
        empty.style.cssText = "padding:24px;text-align:center;color:#9ca3af;font-size:13px;";
        empty.textContent = currentQuery.trim() ? "No results found" : "Start typing to search...";
        resultsList.appendChild(empty);
        return;
      }

      let lastCategory = "";

      for (let i = 0; i < filtered.length; i++) {
        const { cmd, isRecent } = filtered[i]!;

        // Category header
        if (opts.groupByCategory || opts.showCategoryHeaders) {
          if (cmd.category && cmd.category !== lastCategory) {
            lastCategory = cmd.category;
            const catHeader = document.createElement("div");
            catHeader.style.cssText = "padding:8px 16px 4px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;";
            catHeader.textContent = cmd.category;
            resultsList.appendChild(catHeader);
          }
        }

        const item = document.createElement("button");
        item.type = "button";
        item.dataset.index = String(i);
        item.style.cssText = `
          display:flex;align-items:center;gap:10px;width:100%;padding:8px 16px;
          border:none;background:${i === selectedIndex ? "#eef2ff" : "transparent"};
          color:${i === selectedIndex ? "#4338ca" : "#374151"};cursor:pointer;
          text-align:left;font-family:inherit;font-size:13px;
          transition:background 0.08s;
        `;

        if (isRecent) {
          const badge = document.createElement("span");
          badge.textContent = "\u{1F552}";
          badge.style.cssText = "font-size:11px;";
          item.prepend(badge);
        }

        if (cmd.icon) {
          const iconEl = document.createElement("span");
          iconEl.textContent = cmd.icon;
          iconEl.style.cssText = "font-size:16px;width:20px;text-align:center;";
          item.appendChild(iconEl);
        }

        const content = document.createElement("div");
        content.style.cssText = "flex:1;min-width:0;";

        const labelRow = document.createElement("div");
        labelRow.style.cssText = "font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
        labelRow.textContent = cmd.label;
        content.appendChild(labelRow);

        if (cmd.description) {
          const desc = document.createElement("div");
          desc.style.cssText = "font-size:11px;color:#9ca3af;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
          desc.textContent = cmd.description;
          content.appendChild(desc);
        }

        item.appendChild(content);

        if (cmd.shortcut) {
          const kbd = document.createElement("kbd");
          kbd.textContent = cmd.shortcut;
          kbd.style.cssText = `
            font-size:11px;padding:1px 6px;border:1px solid #d1d5db;border-radius:4px;
            background:#f3f4f6;color:#6b7280;font-family:monospace;flex-shrink:0;
          `;
          item.appendChild(kbd);
        }

        item.addEventListener("click", () => execute(cmd));
        item.addEventListener("mouseenter", () => { selectedIndex = i; renderResults(); });

        resultsList.appendChild(item);
      }
    }

    async function execute(cmd: CommandItem): void {
      instance.close();
      await cmd.action();

      // Track as recent
      if (opts.showRecent) {
        recentIds = [cmd.id, ...recentIds.filter((id) => id !== cmd.id)].slice(0, opts.maxRecent);
        try { localStorage.setItem(opts.recentKey, JSON.stringify(recentIds)); } catch { /* ignore */ }
      }
    }

    function openMenu(): void {
      if (isOpenState) return;
      isOpenState = true;
      currentQuery = "";
      input.value = "";
      overlay.style.display = "flex";
      panel.style.display = "flex";

      requestAnimationFrame(() => {
        overlay.style.opacity = "1";
        input.focus();
      });

      renderResults();
      opts.onOpen?.();
    }

    function closeMenu(): void {
      if (!isOpenState) return;
      isOpenState = false;
      overlay.style.display = "none";
      panel.style.display = "none";
      opts.onClose?.();
    }

    // Input handler
    input.addEventListener("input", () => {
      currentQuery = input.value;
      selectedIndex = 0;
      renderResults();
    });

    // Keyboard navigation
    input.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, opts.maxResults - 1);
          renderResults();
          break;
        case "ArrowUp":
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, 0);
          renderResults();
          break;
        case "Enter":
          e.preventDefault();
          const items = resultsList.querySelectorAll<HTMLElement>("button[data-index]");
          const sel = items[selectedIndex];
          if (sel) sel.click();
          break;
        case "Escape":
          e.preventDefault();
          closeMenu();
          break;
      }
    });

    // Click outside to close
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeMenu();
    });

    // Global hotkey
    if (opts.hotkey) {
      document.addEventListener("keydown", (e) => {
        const keyStr = formatKeyEvent(e);
        if (keyStr === opts.hotkey) {
          e.preventDefault();
          instance.toggle();
        }
      });
    }

    function formatKeyEvent(e: KeyboardEvent): string {
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push(e.metaKey ? "Cmd" : "Ctrl");
      if (e.altKey) parts.push("Alt");
      if (e.shiftKey) parts.push("Shift");
      if (e.key.length === 1) parts.push(e.key.toUpperCase());
      else parts.push(e.key);
      return parts.join("+");
    }

    const instance: CommandMenuInstance = {
      element: overlay,

      open() { openMenu(); },
      close() { closeMenu(); },
      toggle() { isOpenState ? closeMenu() : openMenu(); },
      isOpen() { return isOpenState; },

      setCommands(cmds) { commands = [...cmds]; renderResults(); },

      addCommand(cmd) { commands.push(cmd); renderResults(); },

      removeCommand(id) { commands = commands.filter((c) => c.id !== id); renderResults(); },

      search(q) { currentQuery = q; input.value = q; renderResults(); },

      destroy() {
        destroyed = true;
        overlay.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a command menu */
export function createCommandMenu(options: CommandMenuOptions): CommandMenuInstance {
  return new CommandMenuManager().create(options);
}
