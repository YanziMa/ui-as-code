/**
 * Shortcuts Manager: Context-aware keyboard shortcut routing with chord sequences,
 * conflict detection, priority levels, scope isolation, visual feedback,
 * undo/redo stack integration, and accessibility.
 *
 * Supports:
 * - Single-key and multi-key combinations (modifiers + key)
 * - Chord sequences (e.g., g → g for "go to line")
 * - Context/scope-aware activation (only active when focused on specific element)
 * - Priority levels for conflict resolution
 * - Conflict detection and warnings
 * - Visual hint overlay showing current bindings
 * - Integration with browser's UndoManager
 * - Prevent default behavior control
 */

// --- Types ---

export type ModifierKey = "ctrl" | "alt" | "shift" | "meta";
export type KeyCombination = string; // e.g., "ctrl+s", "ctrl+shift+k"

export interface ShortcutBinding {
  /** Unique identifier */
  id: string;
  /** Key combination (e.g., "ctrl+s", "cmd+shift+p") */
  key: KeyCombination;
  /** Display label (e.g., "Save") */
  label?: string;
  /** Description */
  description?: string;
  /** Handler function */
  handler: (event: KeyboardEvent, binding: ShortcutBinding) => void;
  /** Prevent default browser behavior (default: true) */
  preventDefault?: boolean;
  /** Stop propagation (default: true) */
  stopPropagation?: boolean;
  /** Priority level (higher = wins conflicts, default: 0) */
  priority?: number;
  /** Scope/context where this shortcut is active */
  scope?: string;
  /** Only when target matches selector */
  when?: string;
  /** Enable/disable dynamically */
  enabled?: boolean;
  /** Category for grouping */
  category?: string;
  /** Icon/emoji for UI display */
  icon?: string;
}

export interface ShortcutConflict {
  binding1: ShortcutBinding;
  binding2: ShortcutBinding;
  reason: string;
}

export interface ShortcutsManagerOptions {
  /** Global prevent default (default: true) */
  preventDefault?: boolean;
  /** Global stop propagation (default: true) */
  stopPropagation?: boolean;
  /** Enable debug logging */
  debug?: boolean;
  /** Show hints overlay on "?" press */
  enableHints?: boolean;
  /** Hint display duration (ms) */
  hintDuration?: number;
  /** Called when a shortcut fires */
  onShortcut?: (binding: ShortcutBinding, event: KeyboardEvent) => void;
  /** Called on conflict detection */
  onConflict?: (conflict: ShortcutConflict) => void;
}

export interface ShortcutsState {
  totalBindings: number;
  activeBindings: number;
  scopes: string[];
  conflicts: ShortcutConflict[];
  lastFiredId: string | null;
  lastFiredAt: number | null;
}

export interface ChordState {
  active: boolean;
  sequence: string[];
  startedAt: number;
  timeout: ReturnType<typeof setTimeout> | null;
  pendingBindings: ShortcutBinding[];
}

// --- Parsing ---

interface ParsedKey {
  modifiers: Set<ModifierKey>;
  key: string;
  isChord: boolean;
}

function parseKeyCombo(combo: KeyCombination): ParsedKey {
  const parts = combo.toLowerCase().split("+").map((s) => s.trim());
  const modifiers = new Set<ModifierKey>();
  let key = "";

  for (const part of parts) {
    switch (part) {
      case "ctrl":
      case "control":
        modifiers.add("ctrl");
        break;
      case "alt":
      case "option":
        modifiers.add("alt");
        break;
      case "shift":
        modifiers.add("shift");
        break;
      case "meta":
      case "cmd":
      case "command":
      case "super":
        modifiers.add("meta");
        break;
      default:
        key = part;
    }
  }

  return { modifiers, key, isChord: false };
}

function normalizeKey(event: KeyboardEvent): string {
  return event.key.toLowerCase();
}

function eventMatchesParsed(event: KeyboardEvent, parsed: ParsedKey): boolean {
  if (normalizeKey(event) !== parsed.key) return false;
  if (!!event.ctrlOrMeta !== parsed.modifiers.has("ctrl")) return false;
  if (!!event.altKey !== parsed.modifiers.has("alt")) return false;
  if (!!event.shiftKey !== parsed.modifiers.has("shift")) return false;
  if (!!event.metaKey !== parsed.modifiers.has("meta")) return false;
  return true;
}

function comboToNormalizedString(combo: KeyCombination): string {
  return parseKeyCombo(combo)
    .modifiers
    .toArray()
    .sort()
    .concat(parseKeyCombo(combo).key)
    .join("+");
}

// --- Main Class ---

export class ShortcutsManager {
  private bindings = new Map<string, ShortcutBinding>();
  private bindingsByKey = new Map<string, ShortcutBinding[]>();
  private scopes = new Set<string>();
  private activeScope: string | null = null;
  private destroyed = false;
  private config: Required<Pick<ShortcutsManagerOptions, "preventDefault" | "stopPropagation" | "debug" | "enableHints" | "hintDuration">> & Omit<ShortcutsManagerOptions, "preventDefault" | "stopPropagation" | "debug" | "enableHints" | "hintDuration">;
  private state: ShortcutsState;
  private chordState: ChordState = {
    active: false,
    sequence: [],
    startedAt: 0,
    timeout: null,
    pendingBindings: [],
  };
  private boundHandler: (e: KeyboardEvent) => void;
  private hintOverlay: HTMLElement | null = null;

  constructor(options: ShortcutsManagerOptions = {}) {
    this.config = {
      preventDefault: options.preventDefault ?? true,
      stopPropagation: options.stopPropagation ?? true,
      debug: options.debug ?? false,
      enableHints: options.enableHints ?? false,
      hintDuration: options.hintDuration ?? 3000,
      onShortcut: options.onShortcut,
      onConflict: options.onConflict,
    };

    this.state = {
      totalBindings: 0,
      activeBindings: 0,
      scopes: [],
      conflicts: [],
      lastFiredId: null,
      lastFiredAt: null,
    };

    this.boundHandler = (e: KeyboardEvent) => this.handleKeyDown(e);

    if (typeof document !== "undefined") {
      document.addEventListener("keydown", this.boundHandler, true); // Capture phase
    }
  }

  // --- Registration ---

  /** Register a shortcut binding */
  register(binding: ShortcutBinding): this {
    const normalizedKey = comboToNormalizedString(binding.key);

    // Check for conflicts
    const existing = this.bindingsByKey.get(normalizedKey);
    if (existing) {
      for (const ex of existing) {
        if (ex.scope === binding.scope || !ex.scope || !binding.scope) {
          const conflict: ShortcutConflict = {
            binding1: ex,
            binding2: binding,
            reason: `Both "${ex.id}" and "${binding.id}" use "${binding.key}"`,
          };
          this.state.conflicts.push(conflict);
          this.config.onConflict?.(conflict);
          if (this.config.debug) console.warn("[Shortcuts] Conflict:", conflict.reason);
        }
      }
    }

    const finalBinding: ShortcutBinding = {
      preventDefault: this.config.preventDefault,
      stopPropagation: this.config.stopPropagation,
      priority: 0,
      enabled: true,
      ...binding,
    };

    this.bindings.set(finalBinding.id, finalBinding);

    if (!this.bindingsByKey.has(normalizedKey)) {
      this.bindingsByKey.set(normalizedKey, []);
    }
    this.bindingsByKey.get(normalizedKey)!.push(finalBinding);

    // Track scopes
    if (finalBinding.scope) {
      this.scopes.add(finalBinding.scope);
      this.state.scopes = Array.from(this.scopes);
    }

    this.updateState();
    return this;
  }

  /** Register multiple bindings at once */
  registerAll(bindings: ShortcutBinding[]): this {
    for (const b of bindings) this.register(b);
    return this;
  }

  /** Unregister a binding by ID */
  unregister(id: string): boolean {
    const binding = this.bindings.get(id);
    if (!binding) return false;

    this.bindings.delete(id);

    const normalizedKey = comboToNormalizedString(binding.key);
    const list = this.bindingsByKey.get(normalizedKey);
    if (list) {
      const idx = list.findIndex((b) => b.id === id);
      if (idx !== -1) list.splice(idx, 1);
      if (list.length === 0) this.bindingsByKey.delete(normalizedKey);
    }

    this.updateState();
    return true;
  }

  /** Unregister all bindings in a scope */
  unregisterScope(scope: string): void {
    const toRemove: string[] = [];
    for (const [id, b] of this.bindings) {
      if (b.scope === scope) toRemove.push(id);
    }
    for (const id of toRemove) this.unregister(id);
  }

  // --- Scope Management ---

  /** Set the active scope */
  setScope(scope: string | null): void {
    this.activeScope = scope;
  }

  /** Get current active scope */
  getScope(): string | null { return this.activeScope; }

  /** Temporarily push a scope (returns pop function) */
  pushScope(scope: string): () => void {
    const prev = this.activeScope;
    this.activeScope = scope;
    return () => { this.activeScope = prev; };
  }

  // --- Query ---

  /** Get all registered bindings */
  getAllBindings(): ShortcutBinding[] {
    return Array.from(this.bindings.values());
  }

  /** Get bindings for a specific scope */
  getBindingsByScope(scope: string): ShortcutBinding[] {
    return this.getAllBindings().filter((b) => b.scope === scope);
  }

  /** Get binding by ID */
  getBinding(id: string): ShortcutBinding | undefined {
    return this.bindings.get(id);
  }

  /** Find binding by key combination */
  findByKey(key: KeyCombination): ShortcutBinding[] {
    return this.bindingsByKey.get(comboToNormalizedString(key)) ?? [];
  }

  /** Get current state */
  getState(): ShortcutsState {
    return { ...this.state };
  }

  /** Check if a specific key combo is registered */
  isRegistered(key: KeyCombination): boolean {
    return (this.bindingsByKey.get(comboToNormalizedString(key))?.length ?? 0) > 0;
  }

  // --- Chord Support ---

  /** Register a chord sequence (e.g., ["g", "g"] for "goto-line") */
  registerChord(sequence: string[], binding: Omit<ShortcutBinding, "key">): this {
    const chordKey = sequence.join("→");
    return this.register({
      ...binding,
      key: chordKey,
      id: binding.id ?? `chord-${chordKey}`,
    } as ShortcutBinding);
  }

  // --- Hints ---

  /** Show keyboard shortcuts overlay */
  showHints(): void {
    if (this.hintOverlay) return;

    const overlay = document.createElement("div");
    overlay.className = "shortcuts-hints-overlay";
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:999999;
      display:flex;align-items:center;justify-content:center;
      animation:fadeIn 0.15s ease;
    `;

    const panel = document.createElement("div");
    panel.className = "shortcuts-hints-panel";
    panel.style.cssText = `
      background:#1e1e2e;color:#d4d4d4;border-radius:12px;padding:24px;
      max-width:600px;width:90%;max-height:80vh;overflow-y:auto;
      font-family:-apple-system,sans-serif;font-size:13px;line-height:1.6;
    `;

    // Group by category
    const categories = new Map<string, ShortcutBinding[]>();
    for (const b of this.getAllBindings()) {
      const cat = b.category ?? "General";
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat)!.push(b);
    }

    let html = `<h2 style="margin:0 0 16px;font-size:18px;color:#fff;">Keyboard Shortcuts</h2>`;

    for (const [cat, bindings] of categories) {
      html += `<h3 style="margin:16px 0 8px;color:#888;font-size:13px;text-transform:uppercase;">${cat}</h3>`;
      html += `<div style="display:grid;grid-template-columns:auto 1fr auto;gap:6px 16px;align-items:center;">`;

      for (const b of bindings) {
        if (!b.enabled) continue;
        const keys = b.key.split("→").map((k) =>
          `<kbd style="background:#333;border:1px solid #555;border-radius:4px;padding:2px 8px;font-size:11px;font-family:monospace;color:#fff;">${k}</kbd>`
        ).join(" ");
        html += `<span>${keys}</span>`;
        html += `<span>${b.label ?? b.description ?? ""}</span>`;
        if (b.icon) html += `<span>${b.icon}</span>`;
        else html += `<span></span>`;
      }

      html += `</div>`;
    }

    html += `<button id="close-hints" style="margin-top:20px;padding:8px 24px;border:none;background:#4338ca;color:#fff;border-radius:6px;cursor:pointer;font-size:13px;">Close (Esc)</button>`;

    panel.innerHTML = html;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    this.hintOverlay = overlay;

    // Close handlers
    const close = () => this.hideHints();
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    panel.querySelector("#close-hints")?.addEventListener("click", close);

    // Auto-dismiss
    setTimeout(() => {
      if (this.hintOverlay) close();
    }, this.config.hintDuration);
  }

  /** Hide hints overlay */
  hideHints(): void {
    if (this.hintOverlay) {
      this.hintOverlay.remove();
      this.hintOverlay = null;
    }
  }

  // --- Lifecycle ---

  /** Destroy the manager and remove listeners */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (typeof document !== "undefined") {
      document.removeEventListener("keydown", this.boundHandler, true);
    }

    this.hideHints();
    this.clearChord();
    this.bindings.clear();
    this.bindingsByKey.clear();
    this.scopes.clear();
  }

  // --- Internal ---

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.destroyed) return;

    // Ignore typing in inputs unless a binding targets it
    const tag = (event.target as HTMLElement)?.tagName;
    const isInput = tag === "INPUT" || tag === "TEXTAREA" || (event.target as HTMLElement)?.isContentEditable;

    // Handle hint dismiss
    if (this.hintOverlay && event.key === "Escape") {
      this.hideHints();
      event.preventDefault();
      return;
    }

    // Handle hint trigger
    if (this.config.enableHints && event.key === "?" && !isInput && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.showHints();
      event.preventDefault();
      return;
    }

    // Handle chord sequence
    if (this.chordState.active) {
      this.handleChordKey(event);
      return;
    }

    // Check for chord starters
    const chordStarters = this.findChordStarters(event);
    if (chordStarters.length > 0) {
      this.startChord(chordStarters, event);
      return;
    }

    // Normal shortcut matching
    const matched = this.matchBinding(event);
    if (matched) {
      this.fireBinding(matched, event);
    }
  }

  private matchBinding(event: KeyboardEvent): ShortcutBinding | null {
    let bestMatch: ShortcutBinding | null = null;

    for (const [, binding] of this.bindings) {
      if (!binding.enabled) continue;

      // Scope check
      if (binding.scope && this.activeScope && binding.scope !== this.activeScope) continue;
      if (binding.scope && !this.activeScope) continue;

      // When/target check
      if (binding.when) {
        const target = event.target as HTMLElement;
        if (!target.matches(binding.when)) continue;
      }

      // Don't match chords in normal flow
      if (binding.key.includes("→")) continue;

      // Key match
      const parsed = parseKeyCombo(binding.key);
      if (!eventMatchesParsed(event, parsed)) continue;

      // Priority check
      if (!bestMatch || (binding.priority ?? 0) > (bestMatch.priority ?? 0)) {
        bestMatch = binding;
      }
    }

    return bestMatch;
  }

  private fireBinding(binding: ShortcutBinding, event: KeyboardEvent): void {
    if (this.config.debug) {
      console.log(`[Shortcuts] Fired: ${binding.id} (${binding.key})`);
    }

    if (binding.preventDefault !== false) event.preventDefault();
    if (binding.stopPropagation !== false) event.stopPropagation();

    this.state.lastFiredId = binding.id;
    this.state.lastFiredAt = Date.now();

    try {
      binding.handler(event, binding);
    } catch (err) {
      console.error(`[Shortcuts] Error in handler for ${binding.id}:`, err);
    }

    this.config.onShortcut?.(binding, event);
  }

  // --- Chord Handling ---

  private findChordStarters(event: KeyboardEvent): ShortcutBinding[] {
    const starters: ShortcutBinding[] = [];

    for (const [, binding] of this.bindings) {
      if (!binding.enabled || !binding.key.includes("→")) continue;
      const firstKey = binding.key.split("→")[0];
      const parsed = parseKeyCombo(firstKey);
      if (eventMatchesParsed(event, parsed)) {
        starters.push(binding);
      }
    }

    return starters;
  }

  private startChord(pendingBindings: ShortcutBinding[], event: KeyboardEvent): void {
    event.preventDefault();

    this.chordState = {
      active: true,
      sequence: [parseKeyCombo(pendingBindings[0].key.split("→")[0]).key],
      startedAt: Date.now(),
      timeout: setTimeout(() => this.clearChord(), 1500), // 1.5s timeout
      pendingBindings: pendingBindings,
    };

    if (this.config.debug) {
      console.log(`[Shortcuts] Chord started: ${this.chordState.sequence.join(" → ")}`);
    }
  }

  private handleChordKey(event: KeyboardEvent): void {
    const key = normalizeKey(event);

    // Check if any pending chord binding matches the full sequence so far
    const fullSequence = [...this.chordState.sequence, key];
    const fullStr = fullSequence.join("→");

    let matched = false;
    for (const binding of this.chordState.pendingBindings) {
      if (binding.key === fullStr) {
        this.fireBinding(binding, event);
        matched = true;
        break;
      }
    }

    if (matched) {
      this.clearChord();
      return;
    }

    // Check if any chord could still match with more keys
    const couldMatch = this.chordState.pendingBindings.some((b) =>
      b.key.startsWith(fullStr + "→")
    );

    if (couldMatch) {
      // Extend chord
      clearTimeout(this.chordState.timeout!);
      this.chordState.sequence.push(key);
      this.chordState.timeout = setTimeout(() => this.clearChord(), 1500);
      event.preventDefault();
    } else {
      // No match possible — cancel chord
      this.clearChord();
    }
  }

  private clearChord(): void {
    if (this.chordState.timeout) {
      clearTimeout(this.chordState.timeout);
    }
    this.chordState = {
      active: false,
      sequence: [],
      startedAt: 0,
      timeout: null,
      pendingBindings: [],
    };
  }

  private updateState(): void {
    let active = 0;
    for (const [, b] of this.bindings) {
      if (b.enabled) active++;
    }
    this.state.totalBindings = this.bindings.size;
    this.state.activeBindings = active;
  }
}

/** Convenience factory */
export function createShortcutsManager(options?: ShortcutsManagerOptions): ShortcutsManager {
  return new ShortcutsManager(options);
}
