/**
 * Keyboard Shortcuts: comprehensive hotkey system with chord support, context-aware
 * binding, priority levels, capture modes, sequence recording, conflict detection,
 * visual hint overlay, import/export, macOS/Windows key mapping.
 */

// --- Types ---

export interface KeyCombo {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;       // Command on Mac, Win key on Windows
}

export interface ShortcutBinding {
  id: string;
  combo: KeyCombo | KeyCombo[]; // Single or chord (sequence)
  description: string;
  handler: (e: KeyboardEvent) => void | Promise<void>;
  enabled?: () => boolean;
  priority?: number;     // Higher = more important when conflicts occur
  category?: string;     // For grouping in UI
  contexts?: string[];    // Only active in these contexts
  preventDefault?: boolean;
  stopPropagation?: boolean;
  repeatable?: boolean;   // Fire on keyrepeat
  hidden?: boolean;      // Don't show in help overlay
}

export interface ShortcutScope {
  name: string;
  element?: HTMLElement; // null = global/document
  bindings: Map<string, ShortcutBinding>;
  parent?: ShortcutScope;
  enabled: boolean;
}

export interface RecordedSequence {
  combos: KeyCombo[];
  timestamp: number;
  duration: number;
}

// --- Key Combo Utilities ---

/** Normalize a keyboard event to a KeyCombo */
export function eventToCombo(e: KeyboardEvent): KeyCombo {
  return {
    key: normalizeKey(e.key),
    ctrl: e.ctrlKey,
    alt: e.altKey,
    shift: e.shiftKey,
    meta: e.metaKey,
  };
}

/** Normalize key name for cross-platform consistency */
export function normalizeKey(key: string): string {
  const map: Record<string, string> = {
    " ": "Space", ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right",
    Escape: "Escape", Enter: "Enter", Tab: "Tab", Backspace: "Backspace", Delete: "Delete",
    CapsLock: "CapsLock", NumLock: "NumLock", ScrollLock: "ScrollLock",
    PrintScreen: "PrintScreen", Insert: "Insert", Home: "Home", End: "End",
    PageUp: "PageUp", PageDown: "PageDown",
    F1: "F1", F2: "F2", F3: "F3", F4: "F4", F5: "F5", F6: "F6", F7: "F7", F8: "F8",
    F9: "F9", F10: "F10", F11: "F11", F12: "F12",
    NumpadAdd: "Numpad+", NumpadSubtract: "Numpad-", NumpadMultiply: "Numpad*",
    NumpadDivide: "Numpad/", NumpadEnter: "NumpadEnter", NumpadDecimal: ".",
  };
  return map[key] ?? (key.length === 1 ? key.toUpperCase() : key);
}

/** Serialize combo to display string (e.g., "Ctrl+Shift+S") */
export function comboToString(combo: KeyCombo, platform?: string): string {
  const isMac = platform ?? (typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent));
  const parts: string[] = [];
  if (combo.ctrl) parts.push(isMac ? "⌃" : "Ctrl");
  if (combo.alt) parts.push(isMac ? "⌥" : "Alt");
  if (combo.shift) parts.push(isMac ? "⇧" : "Shift");
  if (combo.meta) parts.push(isMac ? "⌘" : (platform === "win" ? "Win" : "Meta"));
  parts.push(combo.key);
  return parts.join(isMac ? "" : "+");
}

/** Parse a combo string back to KeyCombo */
export function parseCombo(str: string): KeyCombo {
  const result: KeyCombo = { key: "" };
  const mods = str.toLowerCase().split(/[\s+]+/);
  for (const m of mods) {
    switch (m) {
      case "ctrl": case "control": result.ctrl = true; break;
      case "alt": case "option": result.alt = true; break;
      case "shift": result.shift = true; break;
      case "meta": case "cmd": case "command": case "super": case "win": result.meta = true; break;
      default:
        if (!result.key && m.length > 0) result.key = m.toUpperCase();
        break;
    }
  }
  return result;
}

/** Check if two combos match */
export function comboMatches(a: KeyCombo, b: KeyCombo): boolean {
  return normalizeKey(a.key) === normalizeKey(b.key) &&
    !!a.ctrl === !!b.ctrl &&
    !!a.alt === !!b.alt &&
    !!a.shift === !!b.shift &&
    !!a.meta === !!b.meta;
}

/** Generate a unique hash for a combo (for Map keys) */
export function comboHash(combo: KeyCombo): string {
  return [
    combo.ctrl ? "C" : "",
    combo.alt ? "A" : "",
    combo.shift ? "S" : "",
    combo.meta ? "M" : "",
    normalizeKey(combo.key),
  ].join("");
}

// --- Shortcut Manager ---

export class ShortcutManager {
  private scopes = new Map<string, ShortcutScope>();
  private globalScope: ShortcutScope;
  private currentContexts: Set<string> = new Set();
  private activeCombos = new Set<string>(); // Currently pressed keys (for chords)
  private chordBuffer: KeyCombo[] = [];
  private chordTimeout: ReturnType<typeof setTimeout> | null = null;
  private chordDelayMs = 500;
  private listeners = new Set<(binding: ShortcutBinding, e: KeyboardEvent) => void>();
  private _enabled = true;

  constructor() {
    this.globalScope = this.createScope("global");
  }

  get enabled(): boolean { return this._enabled; }
  set enabled(v: boolean) { this._enabled = v; }

  /** Create or get a named scope */
  createScope(name: string, element?: HTMLElement): ShortcutScope {
    const scope: ShortcutScope = { name, element, bindings: new Map(), enabled: true };
    this.scopes.set(name, scope);
    return scope;
  }

  /** Get a scope by name */
  getScope(name: string): ShortcutScope | undefined { return this.scopes.get(name); }

  /** Register a shortcut binding */
  register(binding: ShortcutBinding): () => void {
    const scopeName = binding.contexts?.[0] ?? "global";
    let scope = this.scopes.get(scopeName);
    if (!scope) scope = this.createScope(scopeName);

    // Handle chord sequences
    if (Array.isArray(binding.combo)) {
      const firstHash = comboHash(binding.combo[0]);
      scope.bindings.set(`${firstHash}:chord:${binding.id}`, binding);
    } else {
      const hash = comboHash(binding.combo);
      scope.bindings.set(hash, binding);
    }

    // Return unregister function
    return () => {
      if (Array.isArray(binding.combo)) {
        const firstHash = comboHash(binding.combo[0]);
        scope!.bindings.delete(`${firstHash}:chord:${binding.id}`);
      } else {
        scope!.bindings.delete(comboHash(binding.combo));
      }
    };
  }

  /** Register multiple bindings at once */
  registerAll(bindings: ShortcutBinding[]): () => void {
    const unregisters = bindings.map((b) => this.register(b));
    return () => unregisters.forEach((u) => u());
  }

  /** Unregister a binding by ID */
  unregister(id: string): void {
    for (const [, scope] of this.scopes) {
      for (const [key, binding] of scope.bindings) {
        if (binding.id === id) { scope.bindings.delete(key); return; }
      }
    }
  }

  /** Activate a context (enables bindings scoped to it) */
  activateContext(context: string): void { this.currentContexts.add(context); }
  /** Deactivate a context */
  deactivateContext(context: string): void { this.currentContexts.delete(context); }
  /** Set active contexts (replaces all) */
  setContexts(contexts: string[]): void { this.currentContexts = new Set(contexts); }

  /** Bind to an element's keydown event (call once per app) */
  bindToElement(element: HTMLElement | Document = document): () => void {
    const handler = (e: KeyboardEvent) => this.handleKeyDown(e);
    const upHandler = (e: KeyboardEvent) => this.handleKeyUp(e);
    element.addEventListener("keydown", handler as EventListener);
    element.addEventListener("keyup", upHandler as EventListener);
    return () => {
      element.removeEventListener("keydown", handler as EventListener);
      element.removeEventListener("keyup", upHandler as EventListener);
    };
  }

  /** Listen to all shortcut triggers (for logging/debugging) */
  onTrigger(listener: (binding: ShortcutBinding, e: KeyboardEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Get all registered bindings grouped by category */
  getBindingsByCategory(): Map<string, ShortcutBinding[]> {
    const grouped = new Map<string, ShortcutBinding[]>();
    for (const [, scope] of this.scopes) {
      for (const [, binding] of scope.bindings) {
        if (binding.hidden) continue;
        const cat = binding.category ?? "General";
        if (!grouped.has(cat)) grouped.set(cat, []);
        grouped.get(cat)!.push(binding);
      }
    }
    return grouped;
  }

  /** Find binding that would handle a given combo */
  findBinding(combo: KeyCombo): ShortcutBinding | undefined {
    const hash = comboHash(combo);

    // Check global scope first, then context scopes
    const scopesToCheck = [this.globalScope];
    for (const ctx of this.currentContexts) {
      const scope = this.scopes.get(ctx);
      if (scope) scopesToCheck.push(scope);
    }

    let best: ShortcutBinding | undefined;
    for (const scope of scopesToCheck) {
      if (!scope.enabled) continue;
      const direct = scope.bindings.get(hash);
      if (direct) {
        if (!best || (direct.priority ?? 0) > (best.priority ?? 0)) best = direct;
      }
      // Check chord bindings
      const chordPrefix = `${hash}:chord:`;
      for (const [key, binding] of scope.bindings) {
        if (key.startsWith(chordPrefix)) {
          if (!best || (binding.priority ?? 0) > (best.priority ?? 0)) best = binding;
        }
      }
    }

    return best?.enabled?.() !== false ? best : undefined;
  }

  /** Detect conflicting bindings */
  detectConflicts(): Array<{ combo: string; bindings: ShortcutBinding[] }> {
    const comboMap = new Map<string, ShortcutBinding[]>();
    for (const [, scope] of this.scopes) {
      for (const [key, binding] of scope.bindings) {
        if (key.includes(":chord:")) continue; // Skip chord prefixes
        const existing = comboMap.get(key) ?? [];
        existing.push(binding);
        comboMap.set(key, existing);
      }
    }
    const conflicts: Array<{ combo: string; bindings: ShortcutBinding[] }> = [];
    for (const [combo, bindings] of comboMap) {
      if (bindings.length > 1) conflicts.push({ combo, bindings });
    }
    return conflicts;
  }

  /** Export all bindings as serializable data */
  exportBindings(): Array<{ id: string; combo: string; description: string; category?: string }> {
    const result: Array<{ id: string; combo: string; description: string; category?: string }> = [];
    for (const [, scope] of this.scopes) {
      for (const [, binding] of scope.bindings) {
        if (binding.hidden) continue;
        const comboStr = Array.isArray(binding.combo)
          ? binding.combo.map((c) => comboToString(c)).join(" ")
          : comboToString(binding.combo);
        result.push({ id: binding.id, combo: comboStr, description: binding.description, category: binding.category });
      }
    }
    return result;
  }

  // --- Internal ---

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this._enabled) return;
    const combo = eventToCombo(e);

    // Track active keys for chord detection
    this.activeCombos.add(comboHash(combo));

    // Check if we're mid-chord
    if (this.chordBuffer.length > 0) {
      // This could be the next part of the chord
      const fullChord = [...this.chordBuffer, combo];
      const binding = this.findChordBinding(fullChord);
      if (binding) {
        this.clearChordBuffer();
        this.executeBinding(binding, e);
        return;
      }
      // Not a valid chord continuation - check if current combo matches something standalone
    }

    // Look for direct match or chord start
    const directMatch = this.findBinding(combo);
    if (directMatch) {
      if (Array.isArray(directMatch.combo) && directMatch.combo.length > 1) {
        // Start of a chord sequence
        this.chordBuffer.push(combo);
        this.resetChordTimeout();
        return;
      }
      this.executeBinding(directMatch, e);
    }
  }

  private handleKeyUp(_e: KeyboardEvent): void {
    // Clear active tracking (simplified - in production track individual keys)
  }

  private executeBinding(binding: ShortcutBinding, e: KeyboardEvent): void {
    if (binding.preventDefault !== false) e.preventDefault();
    if (binding.stopPropagation) e.stopPropagation();

    // Don't fire on repeat unless allowed
    if (e.repeat && !binding.repeatable) return;

    const result = binding.handler(e);
    if (result instanceof Promise) result.catch((err) => console.error(`Shortcut "${binding.id}" error:`, err));

    for (const listener of this.listeners) listener(binding, e);
  }

  private findChordBinding(combos: KeyCombo[]): ShortcutBinding | undefined {
    const targetHashes = combos.map(comboHash).join(">");
    for (const [, scope] of this.scopes) {
      if (!scope.enabled) continue;
      for (const [, binding] of scope.bindings) {
        if (Array.isArray(binding.combo) && binding.combo.length === combos.length) {
          const bindingHashes = binding.combo.map(comboHash).join(">");
          if (bindingHashes === targetHashes) return binding;
        }
      }
    }
    return undefined;
  }

  private resetChordTimeout(): void {
    if (this.chordTimeout) clearTimeout(this.chordTimeout);
    this.chordTimeout = setTimeout(() => this.clearChordBuffer(), this.chordDelayMs);
  }

  private clearChordBuffer(): void {
    this.chordBuffer = [];
    if (this.chordTimeout) { clearTimeout(this.chordTimeout); this.chordTimeout = null; }
  }
}

// --- Sequence Recorder ---

export class ShortcutRecorder {
  private recorded: KeyCombo[] = [];
  private startTime = 0;
  private listeners = new Set<(sequence: RecordedSequence) => void>();
  private _recording = false;

  get recording(): boolean { return this._recording; }

  /** Start recording a shortcut sequence */
  start(element?: HTMLElement | Document): () => void {
    this.recorded = [];
    this.startTime = Date.now();
    this._recording = true;
    const el = element ?? document;
    const handler = (e: KeyboardEvent) => {
      if (!this._recording) return;
      e.preventDefault();
      e.stopPropagation();
      this.recorded.push(eventToCombo(e));
    };
    el.addEventListener("keydown", handler as EventListener);
    return () => {
      el.removeEventListener("keydown", handler as EventListener);
      this._recording = false;
    };
  }

  /** Stop and return the recorded sequence */
  stop(): RecordedSequence | null {
    if (!this._recording) return null;
    this._recording = false;
    const seq: RecordedSequence = {
      combos: [...this.recorded],
      timestamp: this.startTime,
      duration: Date.now() - this.startTime,
    };
    for (const l of this.listeners) l(seq);
    return seq;
  }

  /** Get the current recorded combo string */
  getCurrentDisplay(): string {
    return this.recorded.map((c) => comboToString(c)).join(" ");
  }

  onRecord(listener: (sequence: RecordedSequence) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

// --- Visual Hint Overlay ---

export class ShortcutOverlay {
  private container: HTMLDivElement | null = null;
  private visible = false;

  /** Show a floating panel listing all shortcuts */
  show(manager: ShortcutManager, options?: { title?: string; searchPlaceholder?: string }): HTMLElement {
    if (this.container) this.hide();

    const container = document.createElement("div");
    container.className = "shortcut-overlay";
    container.setAttribute("role", "dialog");
    container.setAttribute("aria-label", options?.title ?? "Keyboard Shortcuts");

    const style = document.createElement("style");
    style.textContent = `
      .shortcut-overlay {
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 10000; background: var(--bg, #fff); color: var(--fg, #1a1a1a);
        border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        max-width: 600px; width: 90vw; max-height: 80vh; overflow-y: auto;
        padding: 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .shortcut-overlay h2 { margin: 0 0 16px; font-size: 18px; font-weight: 600; }
      .shortcut-category { margin-bottom: 16px; }
      .shortcut-category h3 { margin: 0 0 8px; font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
      .shortcut-item { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; }
      .shortcut-keys { display: flex; gap: 4px; }
      .shortcut-key {
        display: inline-block; padding: 2px 8px; border: 1px solid #ccc;
        border-radius: 4px; font-size: 12px; font-family: monospace;
        background: #f5f5f5; min-width: 24px; text-align: center;
      }
      .shortcut-search { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 16px; font-size: 14px; box-sizing: border-box; }
    `;
    container.appendChild(style);

    const title = document.createElement("h2");
    title.textContent = options?.title ?? "Keyboard Shortcuts";
    container.appendChild(title);

    const search = document.createElement("input");
    search.type = "search";
    search.className = "shortcut-search";
    search.placeholder = options?.searchPlaceholder ?? "Search shortcuts...";
    container.appendChild(search);

    const categories = manager.getBindingsByCategory();
    const categoryElements: Map<string, HTMLElement> = new Map();

    for (const [category, bindings] of categories) {
      const catEl = document.createElement("div");
      catEl.className = "shortcut-category";
      catEl.dataset.category = category;

      const h3 = document.createElement("h3");
      h3.textContent = category;
      catEl.appendChild(h3);

      for (const binding of bindings) {
        const item = document.createElement("div");
        item.className = "shortcut-item";
        item.dataset.search = `${binding.description} ${binding.id} ${Array.isArray(binding.combo)
          ? binding.combo.map((c) => comboToString(c)).join(" ")
          : comboToString(binding.combo)}`.toLowerCase();

        const desc = document.createElement("span");
        desc.textContent = binding.description;
        item.appendChild(desc);

        const keys = document.createElement("span");
        keys.className = "shortcut-keys";
        if (Array.isArray(binding.combo)) {
          for (const c of binding.combo) {
            const k = document.createElement("kbd");
            k.className = "shortcut-key";
            k.textContent = comboToString(c);
            keys.appendChild(k);
            const plus = document.createElement("span");
            plus.textContent = " then ";
            keys.appendChild(plus);
          }
          keys.lastChild?.remove(); // Remove trailing " then "
        } else {
          const k = document.createElement("kbd");
          k.className = "shortcut-key";
          k.textContent = comboToString(binding.combo);
          keys.appendChild(k);
        }
        item.appendChild(keys);
        catEl.appendChild(item);
      }

      categoryElements.set(category, catEl);
      container.appendChild(catEl);
    }

    // Search filter
    search.addEventListener("input", () => {
      const q = search.value.toLowerCase();
      for (const [, el] of categoryElements) {
        const items = el.querySelectorAll(".shortcut-item");
        let hasVisible = false;
        items.forEach((item) => {
          const visible = !q || (item as HTMLElement).dataset.search!.includes(q);
          (item as HTMLElement).style.display = visible ? "" : "none";
          if (visible) hasVisible = true;
        });
        el.style.display = hasVisible ? "" : "none";
      }
    });

    // Close on Escape
    const escHandler = (e: KeyboardEvent) => { if (e.key === "Escape") this.hide(); };
    document.addEventListener("keydown", escHandler);
    (container as any)._escHandler = escHandler;

    // Click outside to close
    const clickHandler = (e: MouseEvent) => {
      if (e.target === container) this.hide();
    };
    container.addEventListener("click", clickHandler);

    document.body.appendChild(container);
    this.container = container;
    this.visible = true;
    return container;
  }

  hide(): void {
    if (this.container) {
      if ((this.container as any)._escHandler) {
        document.removeEventListener("keydown", (this.container as any)._escHandler);
      }
      this.container.remove();
      this.container = null;
    }
    this.visible = false;
  }

  toggle(manager: ShortcutManager, options?: { title?: string }): HTMLElement | null {
    return this.visible ? (this.hide(), null) : this.show(manager, options);
  }
}

// --- Common Shortcut Presets ---

export const commonShortcuts: ShortcutBinding[] = [
  { id: "save", combo: { key: "S", ctrl: true }, description: "Save", category: "File" },
  { id: "saveAs", combo: [{ key: "S", ctrl: true, shift: true }], description: "Save As", category: "File" },
  { id: "open", combo: { key: "O", ctrl: true }, description: "Open File", category: "File" },
  { id: "newFile", combo: { key: "N", ctrl: true }, description: "New File", category: "File" },
  { id: "close", combo: { key: "W", ctrl: true }, description: "Close", category: "File" },
  { id: "undo", combo: { key: "Z", ctrl: true }, description: "Undo", category: "Edit" },
  { id: "redo", combo: [{ key: "Z", ctrl: true, shift: true }], description: "Redo", category: "Edit" },
  { id: "cut", combo: { key: "X", ctrl: true }, description: "Cut", category: "Edit" },
  { id: "copy", combo: { key: "C", ctrl: true }, description: "Copy", category: "Edit" },
  { id: "paste", combo: { key: "V", ctrl: true }, description: "Paste", category: "Edit" },
  { id: "selectAll", combo: { key: "A", ctrl: true }, description: "Select All", category: "Edit" },
  { id: "find", combo: { key: "F", ctrl: true }, description: "Find", category: "Edit" },
  { id: "replace", combo: { key: "H", ctrl: true }, description: "Find & Replace", category: "Edit" },
  { id: "bold", combo: { key: "B", ctrl: true }, description: "Bold", category: "Format" },
  { id: "italic", combo: { key: "I", ctrl: true }, description: "Italic", category: "Format" },
  { id: "underline", combo: { key: "U", ctrl: true }, description: "Underline", category: "Format" },
  { id: "zoomIn", combo: { key: "=", ctrl: true }, description: "Zoom In", category: "View" },
  { id: "zoomOut", combo: { key: "-", ctrl: true }, description: "Zoom Out", category: "View" },
  { id: "zoomReset", combo: { key: "0", ctrl: true }, description: "Reset Zoom", category: "View" },
  { id: "fullscreen", combo: { key: "F11" }, description: "Toggle Fullscreen", category: "View" },
  { id: "help", combo: { key: "/", ctrl: true, shift: true }, description: "Show Shortcuts", category: "Help" },
];
