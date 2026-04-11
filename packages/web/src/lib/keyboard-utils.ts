/**
 * Keyboard Utilities: Hotkey/shortcut management, key binding system,
 * keyboard event normalization, modifier state tracking, key sequence
 * detection, input mode detection, and accessible keyboard navigation.
 */

// --- Types ---

export type ModifierKey = "ctrl" | "alt" | "shift" | "meta" | "mod";

export interface KeyBinding {
  /** Unique identifier for this binding */
  id: string;
  /** The key (e.g., "s", "Enter", "ArrowUp", "F1") */
  key: string;
  /** Required modifiers */
  modifiers?: ModifierKey[];
  /** Handler function called when the binding fires */
  handler: (event: KeyboardEvent) => void;
  /** Description for help menus / tooltips */
  description?: string;
  /** Binding group/category for organization */
  group?: string;
  /** Priority when multiple bindings match (higher = first). Default 0 */
  priority?: number;
  /** Only fire when a specific element is focused? */
  scope?: HTMLElement | string;
  /** Prevent default browser behavior when fired. Default true */
  preventDefault?: boolean;
  /** Stop propagation when fired. Default false */
  stopPropagation?: boolean;
  /** Enable/disable the binding. Default true */
  enabled?: boolean;
}

export interface KeySequence {
  /** Sequence of keys to press in order */
  keys: string[];
  /** Handler when full sequence is matched */
  handler: () => void;
  /** Timeout between keystrokes before reset. Default 1000ms */
  timeoutMs?: number;
  /** Description */
  description?: string;
}

export interface NormalizedKeyEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  repeat: boolean;
  type: "keydown" | "keyup" | "keypress";
  timestamp: number;
  isInputEvent: boolean;
  targetTag: string | null;
}

export interface KeyboardState {
  pressedKeys: Set<string>;
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
  capsLock: boolean;
  numLock: boolean;
  insertMode: boolean;
  lastKeyDownTime: number;
}

export interface NavigationConfig {
  /** Wrap navigation at boundaries. Default false */
  wrap?: boolean;
  /** Include hidden/disabled items. Default false */
  includeDisabled?: boolean;
  /** Custom selector for focusable elements. Default uses roving tabindex pattern */
  selector?: string;
  /** Callback when focus changes */
  onFocusChange?: (element: Element, direction: "next" | "prev" | "first" | "last") => void;
}

// --- Key Code Maps ---

/** Map of common key aliases to their standard values */
export const KEY_ALIASES: Record<string, string> = {
  // Whitespace
  space: " ",
  spacebar: " ",
  enter: "Enter",
  return: "Enter",

  // Arrow keys
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",

  // Function keys
  f1: "F1", f2: "F2", f3: "F3", f4: "F4",
  f5: "F5", f6: "F6", f7: "F7", f8: "F8",
  f9: "F9", f10: "F10", f11: "F11", f12: "F12",

  // Editing
  esc: "Escape",
  escape: "Escape",
  tab: "Tab",
  backspace: "Backspace",
  delete: "Delete",
  del: "Delete",
  ins: "Insert",
  insert: "Insert",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown",

  // Symbols
  plus: "+",
  minus: "-",
  equals: "=",
  comma: ",",
  period: ".",
  slash: "/",
  backslash: "\\",
  backquote: "`",
  bracketleft: "[",
  bracketright: "]",
  semicolon: ";",
  quote: "'",
};

/** Resolve a key alias to its standard value */
export function resolveKey(raw: string): string {
  const lower = raw.toLowerCase();
  return KEY_ALIASES[lower] ?? raw.length === 1 ? raw.toUpperCase() : raw;
}

// --- Event Normalization ---

/** Normalize a keyboard event into a consistent format */
export function normalizeKeyEvent(event: KeyboardEvent): NormalizedKeyEvent {
  const target = event.target as HTMLElement | null;

  return {
    key: event.key,
    code: event.code,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
    repeat: event.repeat,
    type: event.type as "keydown" | "keyup" | "keypress",
    timestamp: Date.now(),
    isInputEvent: !!target && (
      target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT"
    ),
    targetTag: target?.tagName ?? null,
  };
}

/** Check if an event matches a key+modifier combination */
export function eventMatchesBinding(
  event: KeyboardEvent | NormalizedKeyEvent,
  key: string,
  modifiers?: ModifierKey[],
): boolean {
  const resolvedKey = resolveKey(key);
  const e = "key" in event ? event : event as unknown as KeyboardEvent;

  if (e.key !== resolvedKey && e.code !== resolvedKey) return false;

  if (!modifiers || modifiers.length === 0) {
    // No modifiers required — ensure none are held (except maybe shift for key symbols)
    return !e.ctrlKey && !e.altKey && !e.metaKey;
  }

  for (const mod of modifiers) {
    switch (mod) {
      case "ctrl":
        if (!e.ctrlKey) return false;
        break;
      case "alt":
        if (!e.altKey) return false;
        break;
      case "shift":
        if (!e.shiftKey) return false;
        break;
      case "meta":
        if (!e.metaKey) return false;
        break;
      case "mod":
        // mod = Cmd on Mac, Ctrl elsewhere
        const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
        if (isMac ? !e.metaKey : !e.ctrlKey) return false;
        break;
    }
  }

  return true;
}

// --- Hotkey Manager ---

/**
 * HotkeyManager - register, manage, and dispatch keyboard shortcuts.
 *
 * @example
 * ```ts
 * const hotkeys = new HotkeyManager();
 * hotkeys.register({
 *   id: "save",
 *   key: "s",
 *   modifiers: ["mod"],
 *   handler: () => save(),
 *   description: "Save document",
 * });
 * ```
 */
export class HotkeyManager {
  private bindings: Map<string, KeyBinding> = new Map();
  private enabled = true;
  private boundHandler: (e: KeyboardEvent) => void;
  private cleanup: (() => void) | null = null;
  private _state: KeyboardState = {
    pressedKeys: new Set(),
    modifiers: { ctrl: false, alt: false, shift: false, meta: false },
    capsLock: false,
    numLock: false,
    insertMode: false,
    lastKeyDownTime: 0,
  };

  constructor(target: EventTarget = document) {
    this.boundHandler = this._handleKeyDown.bind(this);
    target.addEventListener("keydown", this.boundHandler);
    this.cleanup = () => target.removeEventListener("keydown", this.boundHandler);
  }

  /** Register a new key binding */
  register(binding: KeyBinding): void {
    this.bindings.set(binding.id, {
      preventDefault: true,
      ...binding,
      enabled: binding.enabled !== false,
    });

    // Sort by priority when needed
  }

  /** Unregister a binding by ID */
  unregister(id: string): void {
    this.bindings.delete(id);
  }

  /** Get a registered binding */
  get(id: string): KeyBinding | undefined {
    return this.bindings.get(id);
  }

  /** Check if a binding exists */
  has(id: string): boolean {
    return this.bindings.has(id);
  }

  /** Enable or disable all bindings globally */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Enable/disable a specific binding */
  setBindingEnabled(id: string, enabled: boolean): void {
    const b = this.bindings.get(id);
    if (b) b.enabled = enabled;
  }

  /** Get all bindings, optionally filtered by group */
  getBindings(group?: string): KeyBinding[] {
    const all = Array.from(this.bindings.values());
    return group ? all.filter((b) => b.group === group) : all;
  }

  /** Get current keyboard state snapshot */
  getState(): KeyboardState {
    return { ...this._state, pressedKeys: new Set(this._state.pressedKeys) };
  }

  /** Check if a specific key is currently pressed */
  isKeyPressed(key: string): boolean {
    return this._state.pressedKeys.has(resolveKey(key));
  }

  /** Get all currently pressed keys */
  getPressedKeys(): string[] {
    return Array.from(this._state.pressedKeys);
  }

  /** Generate a help text listing of all active bindings */
  generateHelpText(group?: string): string {
    const bindings = this.getBindings(group)
      .filter((b) => b.enabled)
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    const lines: string[] = [];
    for (const b of bindings) {
      const mods = b.modifiers?.join("+") ?? "";
      const combo = mods ? `${mods}+${b.key}` : b.key;
      const desc = b.description ?? "";
      lines.push(`  ${combo.padEnd(15)} ${desc}`);
    }
    return lines.join("\n");
  }

  /** Remove all bindings and clean up listeners */
  destroy(): void {
    this.bindings.clear();
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
  }

  // --- Internal ---

  private _handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    // Update state
    this._state.pressedKeys.add(event.key);
    this._state.modifiers.ctrl = event.ctrlKey;
    this._state.modifiers.alt = event.altKey;
    this._state.modifiers.shift = event.shiftKey;
    this._state.modifiers.meta = event.metaKey;
    this._state.lastKeyDownTime = Date.now();

    // Find matching bindings (sorted by priority desc)
    const candidates = Array.from(this.bindings.values())
      .filter((b) => b.enabled)
      .filter((b) => eventMatchesBinding(event, b.key, b.modifiers))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    // Scope check
    const scoped = candidates.filter((b) => {
      if (!b.scope) return true;
      const el =
        typeof b.scope === "string"
          ? document.querySelector(b.scope)
          : b.scope;
      return el && (el.contains(event.target as Node) || el === event.target);
    });

    const match = scoped[0];
    if (match) {
      if (match.preventDefault !== false) event.preventDefault();
      if (match.stopPropagation) event.stopPropagation();
      match.handler(event);
    }
  }
}

// --- Key Sequence Detector ---

/**
 * Detects sequences of key presses (e.g., "k", "k", "d" for Konami code).
 */
export class KeySequenceDetector {
  private sequences: KeySequence[] = [];
  private currentBuffer: string[] = [];
  private resetTimer: ReturnType<typeof setTimeout> | null = null;
  private defaultTimeout = 1000;
  private boundHandler: (e: KeyboardEvent) => void;
  private cleanup: (() => void) | null = null;

  constructor(target: EventTarget = document) {
    this.boundHandler = this._handleKeyDown.bind(this);
    target.addEventListener("keydown", this.boundHandler);
    this.cleanup = () => target.removeEventListener("keydown", this.boundHandler);
  }

  /** Register a new key sequence to detect */
  add(sequence: KeySequence): void {
    this.sequences.push(sequence);
  }

  /** Remove a sequence by its key array signature */
  remove(keys: string[]): void {
    this.sequences = this.sequences.filter(
      (s) => JSON.stringify(s.keys) !== JSON.stringify(keys.map(resolveKey)),
    );
  }

  /** Clear all registered sequences and buffer */
  clear(): void {
    this.sequences = [];
    this.currentBuffer = [];
    this._cancelResetTimer();
  }

  /** Destroy and clean up */
  destroy(): void {
    this.clear();
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
  }

  private _handleKeyDown(event: KeyboardEvent): void {
    // Ignore if typing in an input
    const target = event.target as HTMLElement;
    if (
      target?.isContentEditable ||
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA"
    ) {
      return;
    }

    const key = resolveKey(event.key);
    this.currentBuffer.push(key);

    // Reset timer
    this._cancelResetTimer();
    this.resetTimer = setTimeout(() => {
      this.currentBuffer = [];
    }, this.defaultTimeout);

    // Check against all registered sequences
    for (const seq of this.sequences) {
      const resolvedKeys = seq.keys.map(resolveKey);
      const timeout = seq.timeoutMs ?? this.defaultTimeout;

      // Check if current buffer ends with this sequence
      if (this._bufferEndsWith(resolvedKeys)) {
        seq.handler();
        this.currentBuffer = [];
        this._cancelResetTimer();
        return;
      }
    }

    // Trim buffer to reasonable length
    if (this.currentBuffer.length > 20) {
      this.currentBuffer = this.currentBuffer.slice(-10);
    }
  }

  private _bufferEndsWith(needle: string[]): boolean {
    if (this.currentBuffer.length < needle.length) return false;
    const start = this.currentBuffer.length - needle.length;
    for (let i = 0; i < needle.length; i++) {
      if (this.currentBuffer[start + i] !== needle[i]) return false;
    }
    return true;
  }

  private _cancelResetTimer(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }
}

// --- Keyboard Navigation ---

/**
 * RovingTabIndex - implements accessible keyboard navigation within a container.
 * Uses the roving tabindex pattern for ARIA compliance.
 */
export class RovingTabIndex {
  private container: HTMLElement;
  private items: Element[] = [];
  private currentIndex = -1;
  private config: Required<NavigationConfig>;
  private mutationObserver: MutationObserver | null = null;
  private cleanupFns: Array<() => void> = [];

  constructor(container: HTMLElement, config: NavigationConfig = {}) {
    this.container = container;
    this.config = {
      wrap: config.wrap ?? false,
      includeDisabled: config.includeDisabled ?? false,
      selector: config.selector ?? '[role="menuitem"], [role="option"], [role="tab"], [role="treeitem"], button, [tabindex]',
      onFocusChange: config.onFocusChange,
    };

    this._discoverItems();
    this._bindEvents();
    this._observeMutations();

    if (this.items.length > 0) {
      this.focusItem(0);
    }
  }

  /** Focus the next item */
  next(): void {
    if (this.items.length === 0) return;
    let nextIdx = this.currentIndex + 1;
    if (nextIdx >= this.items.length) {
      nextIdx = this.config.wrap ? 0 : this.items.length - 1;
    }
    this.focusItem(nextIdx);
  }

  /** Focus the previous item */
  prev(): void {
    if (this.items.length === 0) return;
    let prevIdx = this.currentIndex - 1;
    if (prevIdx < 0) {
      prevIdx = this.config.wrap ? this.items.length - 1 : 0;
    }
    this.focusItem(prevIdx);
  }

  /** Focus the first item */
  first(): void {
    if (this.items.length > 0) this.focusItem(0);
  }

  /** Focus the last item */
  last(): void {
    if (this.items.length > 0) this.focusItem(this.items.length - 1);
  }

  /** Focus a specific item by index */
  focusItem(index: number): void {
    if (index < 0 || index >= this.items.length) return;

    // Update tabindexes
    if (this.currentIndex >= 0 && this.currentIndex < this.items.length) {
      (this.items[this.currentIndex] as HTMLElement).tabIndex = -1;
    }

    this.currentIndex = index;
    const el = this.items[index] as HTMLElement;
    el.tabIndex = 0;
    el.focus();
    this.config.onFocusChange?.(el, "next");
  }

  /** Focus an item matching a predicate */
  focusBy(predicate: (el: Element) => boolean): boolean {
    const idx = this.items.findIndex(predicate);
    if (idx >= 0) {
      this.focusItem(idx);
      return true;
    }
    return false;
  }

  /** Get currently focused index */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /** Get all navigable items */
  getItems(): Element[] {
    return [...this.items];
  }

  /** Refresh the list of items (call after DOM changes) */
  refresh(): void {
    this._discoverItems();
  }

  /** Destroy and clean up */
  destroy(): void {
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
  }

  // --- Private ---

  private _discoverItems(): void {
    this.items = Array.from(this.container.querySelectorAll(this.config.selector));

    if (!this.config.includeDisabled) {
      this.items = this.items.filter((el) => {
        const htmlEl = el as HTMLElement;
        return !htmlEl.disabled && !htmlEl.getAttribute("aria-disabled");
      });
    }

    // Set initial tab indices
    this.items.forEach((el, i) => {
      (el as HTMLElement).tabIndex = i === 0 ? 0 : -1;
    });
  }

  private _bindEvents(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          this.next();
          break;
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault();
          this.prev();
          break;
        case "Home":
          e.preventDefault();
          this.first();
          break;
        case "End":
          e.preventDefault();
          this.last();
          break;
      }
    };

    this.container.addEventListener("keydown", onKeyDown);
    this.cleanupFns.push(() =>
      this.container.removeEventListener("keydown", onKeyDown),
    );

    // Track manual focus changes
    const onFocusIn = (e: FocusEvent) => {
      const idx = this.items.indexOf(e.target as Element);
      if (idx >= 0 && idx !== this.currentIndex) {
        if (this.currentIndex >= 0) {
          (this.items[this.currentIndex] as HTMLElement).tabIndex = -1;
        }
        (e.target as HTMLElement).tabIndex = 0;
        this.currentIndex = idx;
      }
    };

    this.container.addEventListener("focusin", onFocusIn);
    this.cleanupFns.push(() =>
      this.container.removeEventListener("focusin", onFocusIn),
    );
  }

  private _observeMutations(): void {
    this.mutationObserver = new MutationObserver(() => {
      this._discoverItems();
    });
    this.mutationObserver.observe(this.container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "hidden", "aria-disabled"],
    });
  }
}

// --- Utility Functions ---

/** Format a key binding for display (e.g., "Ctrl+S") */
export function formatHotkey(key: string, modifiers?: ModifierKey[]): string {
  const parts: string[] = [];

  if (modifiers) {
    const displayNames: Record<ModifierKey, string> = {
      ctrl: "Ctrl",
      alt: "Alt",
      shift: "Shift",
      meta: "Cmd",
      mod: navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? "Cmd" : "Ctrl",
    };
    for (const m of modifiers) {
      parts.push(displayNames[m]);
    }
  }

  parts.push(key.length === 1 ? key.toUpperCase() : key);
  return parts.join("+");
}

/** Parse a hotkey string like "Ctrl+Shift+S" into components */
export function parseHotkeyString(str: string): { key: string; modifiers: ModifierKey[] } {
  const parts = str.split("+").map((s) => s.trim());
  const key = parts.pop() ?? "";
  const modMap: Record<string, ModifierKey> = {
    ctrl: "ctrl",
    control: "ctrl",
    alt: "alt",
    option: "alt",
    shift: "shift",
    meta: "meta",
    cmd: "meta",
    command: "meta",
    mod: "mod",
  };

  const modifiers: ModifierKey[] = [];
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (modMap[lower]) {
      modifiers.push(modMap[lower]!);
    }
  }

  return { key: resolveKey(key), modifiers };
}

/** Check if the user is likely typing in a text input */
export function isTypingInInput(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement;
  const isInput =
    target?.isContentEditable ||
    target?.tagName === "INPUT" ||
    target?.tagName === "TEXTAREA" ||
    target?.tagName === "SELECT";

  // Allow special keys even in inputs
  if (isInput && !event.ctrlKey && !event.altKey && !event.metaKey) {
    const allowed = [
      "Escape", "Tab", "F1", "F2", "F3", "F4", "F5",
      "F6", "F7", "F8", "F9", "F10", "F11", "F12",
    ];
    return !allowed.includes(event.key);
  }

  return isInput;
}
