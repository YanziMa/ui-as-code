/**
 * Command Palette: VS Code / Spotlight-style command palette with fuzzy search,
 * keyboard navigation, categories, recent commands, action execution,
 * and customizable rendering.
 */

// --- Types ---

export interface Command {
  /** Unique identifier */
  id: string;
  /** Display title */
  title: string;
  /** Description/subtitle */
  description?: string;
  /** Category for grouping */
  category?: string;
  /** Icon (emoji, URL, or SVG string) */
  icon?: string;
  /** Keyboard shortcut hint */
  shortcut?: string;
  /** Action to execute */
  action: () => void | Promise<void>;
  /** Keywords for fuzzy search (in addition to title/description) */
  keywords?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Danger/destructive action */
  danger?: boolean;
  /** Custom data */
  data?: unknown;
}

export type CommandCategory = string;

export interface CommandPaletteConfig {
  /** Placeholder text (default: "Type a command...") */
  placeholder?: string;
  /** Max visible results (default: 8) */
  maxResults?: number;
  /** Show recently used commands (default: true) */
  showRecent?: boolean;
  /** Max recent commands (default: 10) */
  maxRecent?: number;
  /** Open hotkey (default: "Ctrl+K") */
  hotkey?: string;
  /** Close on execute (default: true) */
  closeOnExecute?: boolean;
  /** Show categories as section headers (default: true) */
  groupByCategory?: boolean;
  /** Reset search after execute (default: true) */
  resetOnExecute?: boolean;
  /** Animation duration (ms, default: 150) */
  animationDuration?: number;
  /** Width (default: 560px) */
  width?: string | number;
  /** Position (default: "top") */
  position?: "top" | "center";
  /** Custom class name */
  className?: string;
  /** Callback when palette opens */
  onOpen?: () => void;
  /** Callback when palette closes */
  onClose?: () => void;
  /** Callback when command is executed */
  onExecute?: (command: Command) => void;
  /** Custom render function for each command item */
  renderCommand?: (command: Command, index: number, isSelected: boolean) => HTMLElement;
  /** Custom filter/sort function */
  customFilter?: (query: string, commands: Command[]) => Command[];
}

export interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  results: Command[];
  selectedIndex: number;
  recentCommands: string[];
}

// --- Command Palette ---

export class CommandPalette {
  private commands: Map<string, Command> = new Map();
  private categories = new Set<CommandCategory>();
  private recentIds: string[] = [];
  private config: Required<CommandPaletteConfig> & CommandPaletteConfig;
  private element: HTMLDivElement | null = null;
  private backdrop: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private resultsContainer: HTMLDivElement | null = null;
  private state: CommandPaletteState = { isOpen: false, query: "", results: [], selectedIndex: 0, recentCommands: [] };
  private listeners = new Set<(state: CommandPaletteState) => void>();
  private hotkeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(config: CommandPaletteConfig = {}) {
    this.config = {
      placeholder: config.placeholder ?? "Type a command or search...",
      maxResults: config.maxResults ?? 8,
      showRecent: config.showRecent ?? true,
      maxRecent: config.maxRecent ?? 10,
      hotkey: config.hotkey ?? "Ctrl+K",
      closeOnExecute: config.closeOnExecute ?? true,
      groupByCategory: config.groupByCategory ?? true,
      resetOnExecute: config.resetOnExecute ?? true,
      animationDuration: config.animationDuration ?? 150,
      width: config.width ?? 560,
      position: config.position ?? "top",
      ...config,
    };

    if (typeof document !== "undefined") this.init();
  }

  // --- Command Management ---

  register(command: Command): () => void {
    this.commands.set(command.id, command);
    if (command.category) this.categories.add(command.category);
    return () => this.commands.delete(command.id);
  }

  registerMany(commands: Command[]): () => void {
    const unregisters: Array<() => void> = [];
    for (const cmd of commands) {
      unregisters.push(this.register(cmd));
    }
    return () => { for (const fn of unregisters) fn(); };
  }

  unregister(id: string): boolean { return this.commands.delete(id); }

  getCommand(id: string): Command | undefined { return this.commands.get(id); }

  getAllCommands(): Command[] { return Array.from(this.commands.values()); }

  getCategories(): CommandCategory[] { return Array.from(this.categories); }

  // --- Palette Control ---

  open(initialQuery = ""): void {
    if (this.state.isOpen) return;
    this.state.isOpen = true;
    this.state.query = initialQuery;
    this.state.selectedIndex = 0;
    this.state.recentCommands = [...this.recentIds];

    this.render();
    this.showElement();
    this.focusInput();

    this.config.onOpen?.();
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  close(): void {
    if (!this.state.isOpen) return;
    this.hideElement();
    this.state.isOpen = false;
    this.state.query = "";
    this.state.results = [];
    this.config.onClose?.();
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  toggle(query = ""): void {
    this.state.isOpen ? this.close() : this.open(query);
  }

  isOpen(): boolean { return this.state.isOpen; }

  getState(): CommandPaletteState { return { ...this.state }; }

  subscribe(listener: (state: CommandPaletteState) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  // --- Search ---

  setQuery(query: string): void {
    this.state.query = query;
    this.state.selectedIndex = 0;
    this.updateResults();
    this.renderResults();
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  getQuery(): string { return this.state.query; }

  selectNext(): void {
    if (this.state.results.length === 0) return;
    this.state.selectedIndex = (this.state.selectedIndex + 1) % this.state.results.length;
    this.scrollToSelected();
    this.renderResults();
  }

  selectPrev(): void {
    if (this.state.results.length === 0) return;
    this.state.selectedIndex = (this.state.selectedIndex - 1 + this.state.results.length) % this.state.results.length;
    this.scrollToSelected();
    this.renderResults();
  }

  selectSelected(): void {
    const selected = this.state.results[this.state.selectedIndex];
    if (selected && !selected.disabled) this.execute(selected);
  }

  // --- Hotkey ---

  bindHotkey(): () => void {
    const combo = parseHotkeyCombo(this.config.hotkey);

    this.boundKeyHandler = (e: KeyboardEvent) => {
      if (matchesHotkey(e, combo)) {
        e.preventDefault();
        this.toggle();
      }
    };

    document.addEventListener("keydown", this.boundKeyHandler);
    return () => {
      if (this.boundKeyHandler) document.removeEventListener("keydown", this.boundKeyHandler);
    };
  }

  unbindHotkey(): void {
    if (this.boundKeyHandler) {
      document.removeEventListener("keydown", this.boundKeyHandler);
      this.boundKeyHandler = null;
    }
  }

  destroy(): void {
    this.close();
    this.unbindHotkey();
    this.element?.remove();
    this.backdrop?.remove();
    this.element = null;
    this.backdrop = null;
    this.commands.clear();
    this.categories.clear();
  }

  // --- Internal: Rendering ---

  private init(): void {
    this.createDOM();
    this.bindHotkey();
    injectPaletteStyles();
  }

  private createDOM(): void {
    // Backdrop
    this.backdrop = document.createElement("div");
    this.backdrop.className = "cp-backdrop";
    this.backdrop.addEventListener("click", () => this.close());

    // Main container
    this.element = document.createElement("div");
    this.element.className = `cp-palette ${this.config.className ?? ""}`;
    this.element.setAttribute("role", "dialog");
    this.element.setAttribute("aria-modal", "true");
    this.element.setAttribute("aria-label", "Command Palette");

    // Search input
    const inputWrapper = document.createElement("div");
    inputWrapper.className = "cp-input-wrapper";

    this.input = document.createElement("input");
    this.input.className = "cp-input";
    this.input.type = "text";
    this.input.placeholder = this.config.placeholder;
    this.input.spellcheck = false;
    this.input.autocomplete = "off";

    inputWrapper.appendChild(this.input);
    this.element.appendChild(inputWrapper);

    // Results container
    this.resultsContainer = document.createElement("div");
    this.resultsContainer.className = "cp-results";
    this.resultsContainer.setAttribute("role", "listbox");
    this.element.appendChild(this.resultsContainer);

    // Footer with shortcut hint
    const footer = document.createElement("div");
    footer.className = "cp-footer";
    footer.innerHTML = `<span class="cp-hint">↑↓ navigate</span><span class="cp-hint">↵ select</span><span class="cp-hint">esc close</span>`;
    this.element.appendChild(footer);

    // Event handlers
    this.input.addEventListener("input", () => this.setQuery(this.input!.value));
    this.input.addEventListener("keydown", (e) => this.handleKeyDown(e));

    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.element);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this.selectNext();
        break;
      case "ArrowUp":
        e.preventDefault();
        this.selectPrev();
        break;
      case "Enter":
        e.preventDefault();
        this.selectSelected();
        break;
      case "Escape":
        e.preventDefault();
        this.close();
        break;
    }
  }

  private updateResults(): void {
    const query = this.state.query.trim().toLowerCase();

    if (!query) {
      // Show recent + all commands
      let results: Command[] = [];
      if (this.config.showRecent && this.recentIds.length > 0) {
        const recent = this.recentIds
          .map((id) => this.commands.get(id))
          .filter((c): c is Command => c !== undefined && !c.disabled);
        results = recent;
      }
      if (results.length === 0) {
        results = Array.from(this.commands.values()).filter((c) => !c.disabled);
      }
      this.state.results = results.slice(0, this.config.maxResults * 3);
      return;
    }

    // Use custom filter or built-in fuzzy scoring
    if (this.config.customFilter) {
      this.state.results = this.config.customFilter(query, Array.from(this.commands.values()));
    } else {
      this.state.results = this.fuzzySearch(query);
    }

    this.state.results = this.state.results.slice(0, this.config.maxResults);
  }

  private fuzzySearch(query: string): Command[] {
    const scored: Array<{ command: Command; score: number }> = [];

    for (const cmd of this.commands.values()) {
      if (cmd.disabled) continue;

      const searchText = `${cmd.title} ${cmd.description ?? ""} ${cmd.keywords ?? ""} ${cmd.category ?? ""}`.toLowerCase();

      // Simple scoring: exact match > startsWith > contains > word boundary
      let score = 0;

      if (cmd.title.toLowerCase() === query) score += 100;
      else if (cmd.title.toLowerCase().startsWith(query)) score += 80;
      else if (searchText.includes(query)) score += 40;

      // Character-by-character scoring for fuzzy match
      let queryIdx = 0;
      let consecutiveBonus = 0;
      for (let i = 0; i < searchText.length && queryIdx < query.length; i++) {
        if (searchText[i] === query[queryIdx]!) {
          queryIdx++;
          consecutiveBonus += 2;
          score += 5 + consecutiveBonus;
          // Word boundary bonus
          if (i === 0 || searchText[i - 1] === " ") score += 10;
        } else {
          consecutiveBonus = 0;
        }
      }

      // Bonus for matching all characters
      if (queryIdx === query.length) score += 20;

      // Category match bonus
      if (cmd.category?.toLowerCase().includes(query)) score += 15;

      // Recent usage boost
      const recentIdx = this.recentIds.indexOf(cmd.id);
      if (recentIdx >= 0) score += Math.max(0, 10 - recentIdx);

      if (score > 0) scored.push({ command: cmd, score });
    }

    return scored.sort((a, b) => b.score - a.score).map((s) => s.command);
  }

  private render(): void {
    this.updateResults();
    this.renderResults();
  }

  private renderResults(): void {
    if (!this.resultsContainer) return;
    this.resultsContainer.innerHTML = "";

    if (this.state.results.length === 0) {
      const empty = document.createElement("div");
      empty.className = "cp-empty";
      empty.textContent = `No results for "${this.state.query}"`;
      this.resultsContainer.appendChild(empty);
      return;
    }

    if (this.config.groupByCategory && this.state.query.trim()) {
      // Group by category
      const grouped = new Map<string, Command[]>();
      const uncategorized: Command[] = [];

      for (const cmd of this.state.results) {
        const cat = cmd.category ?? "";
        if (cat) {
          if (!grouped.has(cat)) grouped.set(cat, []);
          grouped.get(cat)!.push(cmd);
        } else {
          uncategorized.push(cmd);
        }
      }

      for (const [category, cmds] of grouped) {
        this.renderCategoryHeader(category);
        for (const cmd of cmds) this.renderCommandItem(cmd);
      }
      for (const cmd of uncategorized) this.renderCommandItem(cmd);
    } else {
      for (const cmd of this.state.results) this.renderCommandItem(cmd);
    }
  }

  private renderCategoryHeader(category: string): void {
    const header = document.createElement("div");
    header.className = "cp-category-header";
    header.textContent = category;
    this.resultsContainer!.appendChild(header);
  }

  private renderCommandItem(command: Command): void {
    const idx = this.state.results.indexOf(command);
    const isSelected = idx === this.state.selectedIndex;

    if (this.config.renderCommand) {
      const el = this.config.renderCommand(command, idx, isSelected);
      el.setAttribute("role", "option");
      el.setAttribute("aria-selected", String(isSelected));
      el.classList.toggle("cp-selected", isSelected);
      el.addEventListener("click", () => this.execute(command));
      this.resultsContainer!.appendChild(el);
      return;
    }

    const item = document.createElement("div");
    item.className = `cp-item${isSelected ? " cp-selected" : ""}${command.danger ? " cp-danger" : ""}${command.disabled ? " cp-disabled" : ""}`;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(isSelected));
    item.dataset.commandId = command.id;

    item.innerHTML = `
      <span class="cp-item-icon">${command.icon ?? ""}</span>
      <div class="cp-item-content">
        <span class="cp-item-title">${escapeHtml(command.title)}</span>
        ${command.description ? `<span class="cp-item-desc">${escapeHtml(command.description)}</span>` : ""}
      </div>
      ${command.shortcut ? `<span class="cp-item-shortcut">${escapeHtml(command.shortcut)}</span>` : ""}
    `;

    item.addEventListener("click", () => {
      if (!command.disabled) this.execute(command);
    });

    item.addEventListener("mouseenter", () => {
      this.state.selectedIndex = idx;
      this.renderResults();
    });

    this.resultsContainer!.appendChild(item);
  }

  private async execute(command: Command): Promise<void> {
    // Track recent
    this.addToRecent(command.id);

    this.config.onExecute?.(command);
    await command.action();

    if (this.config.resetOnExecute) this.state.query = "";
    if (this.config.closeOnExecute) this.close();
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  private addToRecent(id: string): void {
    this.recentIds = this.recentIds.filter((rid) => rid !== id);
    this.recentIds.unshift(id);
    if (this.recentIds.length > this.config.maxRecent) {
      this.recentIds.pop();
    }
  }

  private showElement(): void {
    if (!this.backdrop || !this.element) return;
    this.backdrop.classList.add("cp-visible");
    this.element.classList.add("cp-visible");
    setTimeout(() => this.focusInput(), 50);
  }

  private hideElement(): void {
    if (!this.backdrop || !this.element) return;
    this.backdrop.classList.remove("cp-visible");
    this.element.classList.remove("cp-visible");
  }

  private focusInput(): void {
    if (this.input) {
      this.input.focus();
      this.input.select();
    }
  }

  private scrollToSelected(): void {
    if (!this.resultsContainer) return;
    const selected = this.resultsContainer.querySelector(".cp-selected");
    if (selected) selected.scrollIntoView({ block: "nearest" });
  }
}

// --- Utility Functions ---

function parseHotkeyCombo(combo: string): { ctrl: boolean; alt: boolean; shift: boolean; meta: boolean; key: string } {
  const parts = combo.split("+").map((p) => p.trim().toLowerCase());
  return {
    ctrl: parts.includes("ctrl") || parts.includes("control"),
    alt: parts.includes("alt"),
    shift: parts.includes("shift"),
    meta: parts.includes("meta") || parts.includes("cmd") || parts.includes("super"),
    key: parts.filter((p) => !["ctrl", "control", "alt", "shift", "meta", "cmd", "super"].includes(p)).pop() ?? "",
  };
}

function matchesHotkey(e: KeyboardEvent, combo: ReturnType<typeof parseHotkeyCombo>): boolean {
  return (
    e.key.toLowerCase() === combo.key &&
    e.ctrlKey === combo.ctrl &&
    e.altKey === combo.alt &&
    e.shiftKey === combo.shift &&
    e.metaKey === combo.meta
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// --- Styles ---

function injectPaletteStyles(): void {
  if (document.getElementById("cp-styles")) return;
  const style = document.createElement("style");
  style.id = "cp-styles";
  style.textContent = `
    .cp-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 99998;
      display: flex; justify-content: center; opacity: 0; pointer-events: none;
      transition: opacity 150ms ease;
    }
    .cp-backdrop.cp-visible { opacity: 1; pointer-events: auto; }
    .cp-palette {
      position: fixed; left: 50%; transform: translateX(-50%) translateY(-20px);
      width: 560px; max-width: calc(100vw - 32px); max-height: calc(100vh - 120px);
      background: #fff; border-radius: 16px; box-shadow: 0 25px 80px rgba(0,0,0,0.25), 0 0 1px rgba(0,0,0,0.1);
      display: flex; flex-direction: column; overflow: hidden;
      opacity: 0; pointer-events: none; transition: opacity 150ms ease, transform 150ms ease;
      z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .cp-palette.cp-visible { opacity: 1; pointer-events: auto; transform: translateX(-50%) translateY(0); }
    .cp-position-top { top: 20%; }
    .cp-position-center { top: 50%; transform: translateX(-50%) translateY(-50%); }
    .cp-position-center.cp-visible { transform: translateX(-50%) translateY(-50%); }
    .cp-input-wrapper { padding: 14px 16px 12px; border-bottom: 1px solid #f0f0f0; }
    .cp-input {
      width: 100%; border: none; outline: none; font-size: 16px; color: #1a1a1a;
      background: #f7f7f8; border-radius: 10px; padding: 10px 14px; box-sizing: border-box;
    }
    .cp-input::placeholder { color: #aaa; }
    .cp-results { overflow-y: auto; padding: 6px 0; max-height: 360px; }
    .cp-empty { padding: 24px; text-align: center; color: #888; font-size: 14px; }
    .cp-category-header {
      padding: 8px 16px 4px; font-size: 11px; font-weight: 600; color: #888;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .cp-item {
      display: flex; align-items: center; gap: 10px; padding: 9px 16px;
      cursor: pointer; transition: background 0.1s; user-select: none;
    }
    .cp-item:hover, .cp-item.cp-selected { background: #f0f4ff; }
    .cp-item.cp-danger .cp-item-title { color: #dc2626; }
    .cp-item.cp-disabled { opacity: 0.45; cursor: not-allowed; }
    .cp-item-icon { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
    .cp-item-content { flex: 1; min-width: 0; }
    .cp-item-title { font-size: 14px; font-weight: 500; color: #1a1a1a; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cp-item-desc { font-size: 12px; color: #888; display: block; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cp-item-shortcut {
      font-size: 11px; color: #999; background: #f0f0f0; padding: 2px 8px;
      border-radius: 4px; font-family: monospace; flex-shrink: 0;
    }
    .cp-footer {
      display: flex; gap: 12px; padding: 8px 16px; border-top: 1px solid #f0f0f0;
      justify-content: center;
    }
    .cp-hint { font-size: 11px; color: #aaa; }
  `;
  document.head.appendChild(style);
}
