/**
 * Keyboard shortcut/hotkey management system.
 */

export interface HotkeyBinding {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Key combination (e.g., "mod+s", "ctrl+shift+k") */
  key: string;
  /** Handler function */
  handler: (event: KeyboardEvent) => void;
  /** Description shown in help UI */
  description?: string;
  /** Category for grouping */
  category?: string;
  /** Whether this binding is currently enabled */
  enabled?: boolean;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
  /** Stop event propagation */
  stopPropagation?: boolean;
  /** When to trigger: 'keydown' or 'keyup' */
  when?: "keydown" | "keyup";
}

export interface HotkeyEvent {
  binding: HotkeyBinding;
  event: KeyboardEvent;
  timestamp: number;
}

export type HotkeyListener = (event: HotkeyEvent) => void;

/** Parse a key combination string into components */
export function parseKeyCombo(combo: string): ParsedKeyCombo {
  const parts = combo.toLowerCase().replace(/\s+/g, "").split("+");
  let ctrl = false;
  let alt = false;
  let shift = false;
  let meta = false;
  let key = "";

  for (const part of parts) {
    switch (part) {
      case "ctrl":
      case "control":
        ctrl = true;
        break;
      case "alt":
      case "option":
        alt = true;
        break;
      case "shift":
        shift = true;
        break;
      case "meta":
      case "cmd":
      case "command":
        meta = true;
        break;
      case "mod":
        // mod = Cmd on Mac, Ctrl on Windows/Linux
        meta = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
        ctrl = !meta;
        break;
      default:
        key = part;
    }
  }

  return { ctrl, alt, shift, meta, key };
}

export interface ParsedKeyCombo {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  key: string;
}

/** Check if a keyboard event matches a parsed combo */
export function eventMatchesCombo(event: KeyboardEvent, combo: ParsedKeyCombo): boolean {
  if (!!event.ctrlKey !== combo.ctrl) return false;
  if (!!event.altKey !== combo.alt) return false;
  if (!!event.shiftKey !== combo.shift) return false;
  if (!!event.metaKey !== combo.meta) return false;

  const eventKey = event.key.toLowerCase();
  return eventKey === combo.key || event.code?.toLowerCase() === `key${combo.key}`;
}

/** Format a key combo for display */
export function formatKeyDisplay(combo: string): string {
  const parsed = parseKeyCombo(combo);
  const parts: string[] = [];

  if (parsed.ctrl) parts.push(isMac() ? "\u2318" : "Ctrl");
  if (parsed.meta && !parsed.ctrl) parts.push("\u2318");
  if (parsed.alt) parts.push(isMac() ? "\u2325" : "Alt");
  if (parsed.shift) parts.push(isMac() ? "\u21E7" : "Shift");

  // Format key name
  const keyName = KEY_DISPLAY_NAMES[parsed.key] ?? parsed.key.toUpperCase();
  parts.push(keyName);

  return isMac() ? parts.join("") : parts.join(" + ");
}

/** Detect if running on macOS */
function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
}

/** Human-readable key names */
const KEY_DISPLAY_NAMES: Record<string, string> = {
  enter: "Enter",
  tab: "Tab",
  escape: "Esc",
  space: "Space",
  arrowup: "\u2191",
  arrowdown: "\u2193",
  arrowleft: "\u219C",
  arrowright: "\u2192",
  backspace: "\u232B",
  delete: "Delete",
  home: "Home",
  end: "End",
  pageup: "PgUp",
  pagedown: "PgDn",
};

/** Main hotkey manager class */
export class HotkeyManager {
  private bindings = new Map<string, HotkeyBinding>();
  private listeners = new Set<HotkeyListener>();
  private enabled = true;
  private scope: string = "global";
  private boundHandler: ((e: KeyboardEvent) => void) | null = null;
  private pressedKeys = new Set<string>();

  constructor(options?: { scope?: string }) {
    this.scope = options?.scope ?? "global";
  }

  /** Register a hotkey binding */
  register(binding: HotkeyBinding): () => void {
    this.bindings.set(binding.id, { ...binding, enabled: binding.enabled !== false });

    if (!this.boundHandler) this.attach();

    return () => this.unregister(binding.id);
  }

  /** Remove a binding by ID */
  unregister(id: string): void {
    this.bindings.delete(id);
    if (this.bindings.size === 0) this.detach();
  }

  /** Enable/disable all bindings */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Enable/disable a specific binding */
  setBindingEnabled(id: string, enabled: boolean): void {
    const binding = this.bindings.get(id);
    if (binding) binding.enabled = enabled;
  }

  /** Add a global listener for all hotkey events */
  addListener(listener: HotkeyListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Get all bindings grouped by category */
  getBindingsByCategory(): Record<string, HotkeyBinding[]> {
    const groups: Record<string, HotkeyBinding[]> = {};
    for (const [, binding] of this.bindings) {
      const cat = binding.category ?? "general";
      if (!groups[cat]) groups[cat] = [];
      groups[cat]!.push(binding);
    }
    return groups;
  }

  /** Get all registered bindings */
  getAllBindings(): HotkeyBinding[] {
    return Array.from(this.bindings.values());
  }

  /** Check if a key combo is already registered */
  isRegistered(combo: string): boolean {
    const targetCombo = parseKeyCombo(combo);
    for (const [, binding] of this.bindings) {
      if (parseKeyCombo(binding.key).key === targetCombo.key &&
          parseKeyCombo(binding.key).ctrl === targetCombo.ctrl &&
          parseKeyCombo(binding.key).alt === targetCombo.alt &&
          parseKeyCombo(binding.key).shift === targetCombo.shift &&
          parseKeyCombo(binding.key).meta === targetCombo.meta) {
        return true;
      }
    }
    return false;
  }

  /** Export current bindings as serializable data */
  exportBindings(): Array<{ id: string; key: string; label: string }> {
    return Array.from(this.bindings.values()).map((b) => ({
      id: b.id,
      key: b.key,
      label: b.label,
    }));
  }

  /** Destroy the manager and clean up */
  destroy(): void {
    this.detach();
    this.bindings.clear();
    this.listeners.clear();
  }

  // --- Private ---

  private attach(): void {
    if (typeof window === "undefined") return;

    this.boundHandler = (e: KeyboardEvent) => this.handleKeyEvent(e);
    window.addEventListener("keydown", this.boundHandler);
  }

  private detach(): void {
    if (this.boundHandler) {
      window.removeEventListener("keydown", this.boundHandler);
      this.boundHandler = null;
    }
  }

  private handleKeyEvent(event: KeyboardEvent): void {
    if (!this.enabled) return;

    // Track pressed keys
    this.pressedKeys.add(event.key.toLowerCase());

    for (const [, binding] of this.bindings) {
      if (!binding.enabled) continue;
      if (binding.when === "keyup") continue;

      const combo = parseKeyCombo(binding.key);
      if (eventMatchesCombo(event, combo)) {
        if (binding.preventDefault !== false) event.preventDefault();
        if (binding.stopPropagation) event.stopPropagation();

        const hotkeyEvent: HotkeyEvent = { binding, event, timestamp: Date.now() };

        try {
          binding.handler(event);
        } catch (err) {
          console.error(`Hotkey error [${binding.id}]:`, err);
        }

        for (const listener of this.listeners) {
          try {
            listener(hotkeyEvent);
          } catch {
            // Ignore listener errors
          }
        }

        return; // Only fire first matching binding
      }
    }
  }
}

/** Create a pre-configured hotkey manager for common app shortcuts */
export function createAppHotkeys(): HotkeyManager {
  const manager = new HotkeyManager({ scope: "app" });

  // Default app hotkeys can be registered here
  return manager;
}

/** Check if any modifier keys are currently held down */
export function areModifiersDown(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.altKey || event.metaKey || event.shiftKey;
}

/** Get a human-readable representation of currently held modifier keys */
export function getModifierString(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  if (event.metaKey) parts.push("Meta");
  return parts.join("+");
}
