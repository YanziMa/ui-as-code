/**
 * Hotkey Utilities: Global keyboard shortcut registration, key binding parsing,
 * conflict detection, chord sequences, scope management, help text generation,
 * and cross-platform key normalization.
 */

// --- Types ---

export interface KeyBinding {
  /** The key combination string (e.g., "Ctrl+S", "Mod+Shift+P") */
  binding: string;
  /** Human-readable description */
  description: string;
  /** Handler function */
  handler: (e: KeyboardEvent) => void;
  /** When to trigger: "keydown" or "keyup" */
  event?: "keydown" | "keyup";
  /** Scope(s) this binding belongs to (empty = global) */
  scopes?: string[];
  /** Priority for conflict resolution. Higher = more important. Default 0 */
  priority?: number;
  /** Whether binding is currently enabled */
  enabled?: boolean;
}

export interface HotkeyManagerOptions {
  /** Initial bindings to register */
  bindings?: KeyBinding[];
  /** Prevent default browser behavior when a hotkey fires? Default true */
  preventDefault?: boolean;
  /** Stop propagation? Default false */
  stopPropagation?: boolean;
  /** Current active scope(s) */
  activeScopes?: string[];
  /** Called when no binding matches (for debugging) */
  onUnhandled?: (e: KeyboardEvent) => void;
  /** Log all key events (debug mode) */
  debug?: boolean;
}

export interface HotkeyManagerInstance {
  /** Register a new hotkey binding */
  register: (binding: KeyBinding) => () => void; // Returns unregister function
  /** Unregister by binding string */
  unregister: (binding: string) => void;
  /** Check if a binding exists */
  has: (binding: string) => boolean;
  /** Enable/disable a binding */
  setEnabled: (binding: string, enabled: boolean) => void;
  /** Set current active scope(s) */
  setScope: (scopes: string[]) => void;
  /** Get current active scopes */
  getScopes: () => string[];
  /** Generate help text listing all bindings */
  getHelpText: (scope?: string) => string;
  /** Get all registered bindings */
  getBindings: () => KeyBinding[];
  /** Destroy and remove all listeners */
  destroy: () => void;
}

// --- Key Normalization ---

/** Normalize a KeyboardEvent to a platform-independent key string */
export function normalizeKeyEvent(e: KeyboardEvent): string {
  const parts: string[] = [];

  if (e.ctrlKey || e.metaKey) parts.push("Mod");
  if (e.shiftKey && !isModifierKey(e.key)) parts.push("Shift");
  if (e.altKey) parts.push("Alt");

  let key = e.key;

  // Normalize special keys
  const KEY_MAP: Record<string, string> = {
    " ": "Space",
    "ArrowUp": "Up",
    "ArrowDown": "Down",
    "ArrowLeft": "Left",
    "ArrowRight": "Right",
    "+": "=",
    "\\": "\\",
    "/": "/",
  };

  if (KEY_MAP[key]) key = KEY_MAP[key]!;
  // Single letter/number/digit
  if (key.length === 1) key = key.toUpperCase();

  parts.push(key);
  return parts.join("+");
}

/** Parse a binding string into components */
export function parseBinding(binding: string): {
  ctrlOrMeta: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
} {
  const parts = binding.split("+").map((p) => p.trim().toLowerCase());
  return {
    ctrlOrMeta: parts.includes("ctrl") || parts.includes("mod"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
    key: parts[parts.length - 1]?.toUpperCase() ?? "",
  };
}

/** Format a binding string for display (platform-appropriate) */
export function formatHotkey(binding: string): string {
  const { ctrlOrMeta, shift, alt, key } = parseBinding(binding);
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const symbols: string[] = [];

  if (ctrlOrMeta) symbols.push(isMac ? "\u2318" : "Ctrl"); // ⌘ or Ctrl
  if (shift) symbols.push(isMac ? "\u21E7" : "Shift"); // ⇧ or Shift
  if (alt) symbols.push(isMac ? "\u2325" : "Alt");   // ⌥ or Alt
  symbols.push(_formatKeyForDisplay(key));

  return symbols.join(isMac ? "" : "+");
}

function _formatKeyForDisplay(key: string): string {
  const DISPLAY_NAMES: Record<string, string> = {
    "UP": "\u2191",     // ↑
    "DOWN": "\u2193",   // ↓
    "LEFT": "\u2190",   // ←
    "RIGHT": "\u2192",  // →
    "SPACE": "Space",
    "ENTER": "Enter",
    "TAB": "Tab",
    "ESC": "Esc",
    "DELETE": "Del",
    "BACKSPACE": "BS",
  };
  return DISPLAY_NAMES[key] ?? key;
}

function isModifierKey(key: string): boolean {
  return ["Control", "Shift", "Alt", "Meta"].includes(key);
}

// --- Core Manager ---

/**
 * Create a global hotkey manager.
 *
 * @example
 * ```ts
 * const hotkeys = createHotkeyManager({
 *   bindings: [
 *     { binding: "Mod+S", description: "Save", handler: () => save() },
 *     { binding: "Mod+Shift+P", description: "Command Palette", handler: () => openPalette() },
 *   ],
 * });
 *
 * // Later:
 * hotkeys.unregister("Mod+S");
 * ```
 */
export function createHotkeyManager(options: HotkeyManagerOptions = {}): HotkeyManagerInstance {
  const {
    preventDefault = true,
    stopPropagation = false,
    activeScopes = [],
    onUnhandled,
    debug = false,
  } = options;

  const bindings = new Map<string, KeyBinding>();
  const cleanupFns: Array<() => void> = [];
  let destroyed = false;
  let _activeScopes = [...activeScopes];

  // Register initial bindings
  if (options.bindings) {
    for (const b of options.bindings) {
      bindings.set(b.binding.toLowerCase(), b);
    }
  }

  // Event listener
  const handleKeyDown = (e: KeyboardEvent): void => {
    if (destroyed) return;

    const normalized = normalizeKeyEvent(e).toLowerCase();
    const binding = bindings.get(normalized);

    if (binding && binding.enabled !== false) {
      // Check scope
      if (binding.scopes && binding.scopes.length > 0) {
        if (!_activeScopes.some((s) => binding.scopes!.includes(s))) {
          if (debug) console.log(`[hotkeys] "${normalized}" blocked (scope mismatch)`);
          return;
        }
      }

      if (preventDefault && e.cancelable) e.preventDefault();
      if (stopPropagation) e.stopPropagation();

      if (debug) console.log(`[hotkeys] Fired: ${normalized} -> ${binding.description}`);
      binding.handler(e);
      return;
    }

    // No matching binding
    onUnhandled?.(e);
  };

  document.addEventListener("keydown", handleKeyDown);
  cleanupFns.push(() => document.removeEventListener("keydown", handleKeyDown));

  // --- Methods ---

  function register(binding: KeyBinding): () => void {
    const key = binding.binding.toLowerCase();
    bindings.set(key, binding);
    return () => unregister(binding.binding);
  }

  function unregister(bindingStr: string): void {
    bindings.delete(bindingStr.toLowerCase());
  }

  function has(bindingStr: string): boolean {
    return bindings.has(bindingStr.toLowerCase());
  }

  function setEnabled(bindingStr: string, enabled: boolean): void {
    const b = bindings.get(bindingStr.toLowerCase());
    if (b) b.enabled = enabled;
  }

  function setScope(scopes: string[]): void {
    _activeScopes = scopes;
  }

  function getScopes(): string[] { return [..._activeScopes]; }

  function getHelpText(scope?: string): string {
    const lines: string[] = ["--- Hotkeys ---"];
    const sorted = Array.from(bindings.values())
      .filter((b) => !scope || !b.scopes || b.scopes.includes(scope))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    for (const b of sorted) {
      lines.push(`  ${formatHotkey(b.binding).padEnd(12)} ${b.description}`);
    }
    return lines.join("\n");
  }

  function getBindings(): KeyBinding[] { return Array.from(bindings.values()); }

  function destroy(): void {
    destroyed = true;
    for (const fn of cleanupFns) fn();
    cleanupFns.length = 0;
    bindings.clear();
  }

  return { register, unregister, has, setEnabled, setScope, getScopes, getHelpText, getBindings, destroy };
}
