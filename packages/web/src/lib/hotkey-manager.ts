/**
 * Hotkey Manager: Global keyboard shortcut system with chord support,
 * context-aware binding, conflict detection, priority levels,
 * key sequence recording, description generation, scope isolation,
 * visual hint overlay, and cross-platform key normalization.
 */

// --- Types ---

export type KeyModifier = "ctrl" | "alt" | "shift" | "meta" | "mod";
export type Scope = "global" | "input" | "textarea" | "select" | string;
export type HotkeyPriority = "critical" | "high" | "normal" | "low";

export interface HotkeyBinding {
  id: string;
  /** Key combination (e.g., "ctrl+s", "mod+shift+k") */
  combo: string;
  /** Human-readable description */
  description: string;
  /** Handler function */
  handler: (event: KeyboardEvent) => void | boolean; // Return false to prevent default
  /** When this hotkey is enabled */
  when?: () => boolean;
  /** Scope where this binding is active */
  scope?: Scope;
  /** Priority for conflict resolution */
  priority?: HotkeyPriority;
  /** Whether binding is currently enabled */
  enabled?: boolean;
  /** Group for batch enable/disable */
  group?: string;
  /** Allow repeat (keydown while held) */
  allowRepeat?: boolean;
  /** Custom CSS class for hint overlay */
  className?: string;
}

export interface HotkeyEvent {
  id: string;
  combo: string;
  event: "trigger" | "conflict" | "record" | "enable" | "disable";
  timestamp: number;
  scope?: Scope;
}

export interface RecordedHotkey {
  keys: string[];
  combo: string;
  modifiers: Set<KeyModifier>;
  timestamp: number;
}

export interface HotkeyHint {
  element: HTMLElement;
  binding: HotkeyBinding;
  visible: boolean;
}

export interface HotkeyStats {
  totalBindings: number;
  activeBindings: number;
  totalTriggers: number;
  conflicts: number;
  groups: Record<string, number>;
}

// --- Key Normalization ---

/** Normalize a KeyboardEvent to a platform-agnostic key string */
export function normalizeKeyEvent(e: KeyboardEvent): { key: string; modifiers: Set<KeyModifier> } {
  const modifiers = new Set<KeyModifier>();
  if (e.ctrlKey || e.key === "Control") modifiers.add("ctrl");
  if (e.altKey || e.key === "Alt") modifiers.add("alt");
  if (e.shiftKey || e.key === "Shift") modifiers.add("shift");
  if (e.metaKey || e.key === "Meta") modifiers.add("meta");

  let key = e.key.toLowerCase();
  // Map special keys
  const keyMap: Record<string, string> = {
    " ": "space", " ": "space",
    "arrowup": "up", "arrowdown": "down", "arrowleft": "left", "arrowright": "right",
    "escape": "esc",
    "enter": "return",
    "backspace": "bspace",
    "tab": "tab",
    "delete": "del",
    "insert": "ins",
    "pageup": "pgup", "pagedown": "pgdn",
    "home": "home", "end": "end",
    "f1": "f1", "f2": "f2", "f3": "f3", "f4": "f4", "f5": "f5", "f6": "f6",
    "f7": "f7", "f8": "f8", "f9": "f9", "f10": "f10", "f11": "f11", "f12": "f12",
  };
  if (keyMap[key]) key = keyMap[key];

  return { key, modifiers };
}

/** Parse a combo string into components */
export function parseCombo(combo: string): { key: string; modifiers: Set<KeyModifier> } {
  const parts = combo.toLowerCase().split("+").map((s) => s.trim());
  const modifiers = new Set<KeyModifier>();
  let key = "";

  for (const part of parts) {
    switch (part) {
      case "ctrl": case "control": modifiers.add("ctrl"); break;
      case "alt": case "option": modifiers.add("alt"); break;
      case "shift": modifiers.add("shift"); break;
      case "meta": case "cmd": case "command": case "super": modifiers.add("meta"); break;
      case "mod":
        // Platform-appropriate: ctrl on Win/Linux, meta on Mac
        if (typeof navigator !== "undefined" && /Mac|iPod|iPhone/.test(navigator.platform)) modifiers.add("meta");
        else modifiers.add("ctrl");
        break;
      default:
        key = part.toLowerCase();
        break;
    }
  }

  return { key, modifiers };
}

/** Build a combo string from parts */
export function buildCombo(key: string, modifiers: Set<KeyModifier> | KeyModifier[]): string {
  const modSet = Array.isArray(modifiers) ? new Set(modifiers) : modifiers;
  const parts: string[] = [];
  if (modSet.has("ctrl")) parts.push("ctrl");
  if (modSet.has("alt")) parts.push("alt");
  if (modSet.has("shift")) parts.push("shift");
  if (modSet.has("meta")) parts.push("cmd");
  parts.push(key);
  return parts.join("+");
}

/** Check if two combos are equivalent */
export function combosEqual(a: string, b: string): boolean {
  const pa = parseCombo(a);
  const pb = parseCombo(b);
  return pa.key === pb.key && setsEqual(pa.modifiers, pb.modifiers);
}

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

// --- Hotkey Manager ---

export class HotkeyManager {
  private bindings = new Map<string, HotkeyBinding>();
  private listeners = new Set<(event: HotkeyEvent) => void>();
  private groups = new Map<string, boolean>(); // group -> enabled
  private scopeStack: Scope[] = ["global"];
  private triggerCount = 0;
  private boundHandler: ((e: KeyboardEvent) => void) | null = null;
  private hints = new Map<string, HotkeyHint>();
  private recorder: { active: boolean; keys: string[]; startTime: number } | null = null;
  private recordListeners = new Set<(recorded: RecordedHotkey) => void>();

  constructor() {}

  /** Register a hotkey binding */
  register(binding: HotkeyBinding): () => void {
    this.bindings.set(binding.id, binding);

    // Check for conflicts
    this.checkConflicts(binding);

    return () => this.unregister(binding.id);
  }

  /** Unregister a hotkey by ID */
  unregister(id: string): boolean {
    return this.bindings.delete(id);
  }

  /** Enable a group of hotkeys */
  enableGroup(group: string): void {
    this.groups.set(group, true);
    for (const [, binding] of this.bindings) {
      if (binding.group === group) binding.enabled = true;
    }
    this.listeners.forEach((l) => l({ id: "", combo: "", event: "enable", timestamp: Date.now() }));
  }

  /** Disable a group of hotkeys */
  disableGroup(group: string): void {
    this.groups.set(group, false);
    for (const [, binding] of this.bindings) {
      if (binding.group === group) binding.enabled = false;
    }
    this.listeners.forEach((l) => l({ id: "", combo: "", event: "disable", timestamp: Date.now() }));
  }

  /** Start listening for keyboard events (call after registering) */
  attach(target: EventTarget = document): void {
    if (this.boundHandler) return;

    this.boundHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    target.addEventListener("keydown", this.boundHandler as EventListener);
  }

  /** Stop listening */
  detach(target: EventTarget = document): void {
    if (this.boundHandler) {
      target.removeEventListener("keydown", this.boundHandler as EventListener);
      this.boundHandler = null;
    }
  }

  /** Push a scope onto the stack */
  pushScope(scope: Scope): void {
    this.scopeStack.push(scope);
  }

  /** Pop the current scope */
  popScope(): Scope | undefined {
    return this.scopeStack.pop();
  }

  /** Get current scope */
  getCurrentScope(): Scope { return this.scopeStack[this.scopeStack.length - 1] ?? "global"; }

  /** Find a binding by combo */
  findByCombo(combo: string): HotkeyBinding | undefined {
    for (const [, binding] of this.bindings) {
      if (combosEqual(binding.combo, combo)) return binding;
    }
    return undefined;
  }

  /** List all bindings */
  getBindings(): HotkeyBinding[] { return Array.from(this.bindings.values()); }

  /** List bindings filtered by criteria */
  filterBindings(options?: { scope?: Scope; group?: string; enabled?: boolean }): HotkeyBinding[] {
    let result = Array.from(this.bindings.values());
    if (options?.scope) result = result.filter((b) => b.scope === options.scope);
    if (options?.group) result = result.filter((b) => b.group === options.group);
    if (options?.enabled !== undefined) result = result.filter((b) => (b.enabled ?? true) === options.enabled);
    return result;
  }

  /** Subscribe to events */
  onEvent(listener: (event: HotkeyEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Show a hint overlay for a binding */
  showHint(id: string, container: HTMLElement): HTMLElement | null {
    const binding = this.bindings.get(id);
    if (!binding) return null;

    const el = document.createElement("div");
    el.className = `hotkey-hint ${binding.className ?? ""}`;
    el.setAttribute("data-hotkey-id", id);
    el.innerHTML = `<span class="hotkey-hint-combo">${this.formatCombo(binding.combo)}</span><span class="hotkey-hint-desc">${binding.description}</span>`;
    Object.assign(el.style, {
      position: "absolute", zIndex: "99999", background: "#333", color: "#fff",
      padding: "4px 8px", borderRadius: "6px", fontSize: "12px", pointerEvents: "none",
      whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    });

    container.appendChild(el);
    this.hints.set(id, { element: el, binding, visible: true });
    return el;
  }

  /** Hide a hint overlay */
  hideHint(id: string): void {
    const hint = this.hints.get(id);
    if (hint) { hint.element.remove(); this.hints.delete(id); }
  }

  /** Hide all hints */
  hideAllHints(): void {
    for (const [id] of this.hints) this.hideHint(id);
  }

  /** Start recording a key combination */
  startRecording(onRecord: (recorded: RecordedHotkey) => void): () => void {
    this.recorder = { active: true, keys: [], startTime: Date.now() };
    this.recordListeners.add(onRecord);

    const handler = (e: KeyboardEvent) => {
      if (!this.recorder?.active) return;
      e.preventDefault();
      e.stopPropagation();

      const { key } = normalizeKeyEvent(e);
      if (key === "escape") {
        this.stopRecording();
        return;
      }

      if (!this.recorder.keys.includes(key)) {
        this.recorder.keys.push(key);
      }
    };

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      if (this.recorder?.active) this.stopRecording();
    };
  }

  /** Stop recording and emit result */
  stopRecording(): RecordedHotkey | null {
    if (!this.recorder) return null;

    const { keys, startTime } = this.recorder;
    const recorded: RecordedHotkey = {
      keys,
      combo: buildCombo(keys[keys.length - 1] ?? "", keys.slice(0, -1)),
      modifiers: new Set(),
      timestamp: Date.now() - startTime,
    };

    this.recorder.active = false;
    this.recorder = null;

    for (const l of this.recordListeners) l(recorded);
    this.recordListeners.clear();

    this.listeners.forEach((l) => l({ id: "", combo: recorded.combo, event: "record", timestamp: Date.now() }));

    return recorded;
  }

  /** Get statistics */
  getStats(): HotkeyStats {
    const groups: Record<string, number> = {};
    for (const [, b] of this.bindings) {
      if (b.group) groups[b.group] = (groups[b.group] ?? 0) + 1;
    }
    return {
      totalBindings: this.bindings.size,
      activeBindings: Array.from(this.bindings.values()).filter((b) => b.enabled !== false).length,
      totalTriggers: this.triggerCount,
      conflicts: this.countConflicts(),
      groups,
    };
  }

  /** Export all bindings as JSON */
  exportBindings(): object[] {
    return Array.from(this.bindings.values()).map((b) => ({
      id: b.id, combo: b.combo, description: b.description,
      scope: b.scope, priority: b.priority, group: b.group, enabled: b.enabled,
    }));
  }

  // --- Internal ---

  private handleKeyDown(e: KeyboardEvent): void {
    // Don't capture when typing in inputs (unless scoped)
    const target = e.target as HTMLElement;
    const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
    const currentScope = this.getCurrentScope();

    if (isInput && currentScope === "global") return;

    const { key, modifiers } = normalizeKeyEvent(e);

    // Handle recording mode
    if (this.recorder?.active) {
      if (!this.recorder.keys.includes(key)) this.recorder.keys.push(key);
      return;
    }

    // Find matching binding
    const matched = this.findMatch(key, modifiers, currentScope);
    if (!matched) return;

    // Check conditions
    if (matched.when && !matched.when()) return;
    if (matched.enabled === false) return;
    if (matched.group && !this.groups.get(matched.group)) return;

    // Check repeat
    if (e.repeat && !matched.allowRepeat) return;

    // Prevent default if handler returns false or if it's a special key
    const result = matched.handler(e);
    if (result === false) e.preventDefault();

    this.triggerCount++;
    this.listeners.forEach((l) => l({
      id: matched.id,
      combo: matched.combo,
      event: "trigger",
      timestamp: Date.now(),
      scope: currentScope,
    }));
  }

  private findMatch(key: string, modifiers: Set<KeyModifier>, scope: Scope): HotkeyBinding | null {
    let bestMatch: HotkeyBinding | null = null;
    let bestPriority = 99;

    for (const [, binding] of this.bindings) {
      if (binding.enabled === false) continue;
      if (binding.scope && binding.scope !== scope && binding.scope !== "global") continue;

      const parsed = parseCombo(binding.combo);
      if (parsed.key !== key) continue;
      if (!setsEqual(parsed.modifiers, modifiers)) continue;

      const priorityWeight = { critical: 0, high: 1, normal: 2, low: 3 }[binding.priority ?? "normal"] ?? 2;
      if (priorityWeight < bestPriority) {
        bestPriority = priorityWeight;
        bestMatch = binding;
      }
    }

    return bestMatch;
  }

  private checkConflicts(newBinding: HotkeyBinding): void {
    for (const [, existing] of this.bindings) {
      if (existing.id === newBinding.id) continue;
      if (combosEqual(existing.combo, newBinding.combo)) {
        this.listeners.forEach((l) => l({
          id: newBinding.id, combo: newBinding.combo,
          event: "conflict", timestamp: Date.now(),
        }));
      }
    }
  }

  private countConflicts(): number {
    let count = 0;
    const seen = new Set<string>();
    for (const [, b] of this.bindings) {
      if (seen.has(b.combo)) count++;
      seen.add(b.combo);
    }
    return count;
  }

  private formatCombo(combo: string): string {
    const { key, modifiers } = parseCombo(combo);
    const modSymbols: Record<string, string> = {
      ctrl: "\u2303", alt: "\u2325", shift: "\u21E7", cmd: "\u2318",
    };
    const parts: string[] = [];
    for (const m of modifiers) parts.push(modSymbols[m] ?? m.toUpperCase());
    parts.push(key.toUpperCase());
    return parts.join(" ");
  }
}
