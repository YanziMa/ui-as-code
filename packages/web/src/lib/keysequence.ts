/**
 * Key Sequence: Keyboard shortcut/sequence manager with chord support,
 * key combination detection, sequence recording, macro playback,
 * and cross-browser compatibility.
 *
 * Provides:
 *   - Key binding registration with modifiers (Ctrl, Alt, Shift, Meta)
 *   - Chord combinations (e.g., "g then o" for GitHub-style go-to)
 *   - Sequence detection with timeout
 *   - Scope filtering (input fields, specific elements)
 *   - Recording and playback of key sequences
 *   - Visual hint display for available shortcuts
 */

// --- Types ---

export interface KeyBinding {
  /** Unique identifier for this binding */
  id: string;
  /** Key combination string (e.g., "ctrl+s", "mod+shift+p") */
  keys: string;
  /** Handler function */
  handler: (event: KeyboardEvent) => void;
  /** Human-readable description */
  description?: string;
  /** When the binding is active */
  when?: "always" | "focused" | "editing" | "custom";
  /** Custom predicate for activation */
  whenFn?: () => boolean;
  /** Priority (higher = first to match) */
  priority?: number;
  /** Whether binding is enabled */
  enabled?: boolean;
}

export interface KeySequence {
  /** Sequence of key strings */
  steps: string[];
  /** Handler called after full sequence matches */
  handler: (event: KeyboardEvent) => void;
  /** Description */
  description?: string;
  /** Timeout between keystrokes in ms (default: 1000) */
  timeout?: number;
  /** Enabled state */
  enabled?: boolean;
}

export interface KeyChord {
  /** Keys that must be held simultaneously */
  keys: string[];
  /** Handler */
  handler: (event: KeyboardEvent) => void;
  /** Description */
  description?: string;
}

export interface MacroStep {
  type: "keydown" | "keyup" | "delay";
  key: string;
  delayMs?: number;
}

export interface Macro {
  name: string;
  steps: MacroStep[];
  /** Playback speed multiplier (1 = normal) */
  speed?: number;
}

export interface KeySequenceManagerConfig {
  /** Default scope for bindings (default: "always") */
  defaultScope?: KeyBinding["when"];
  /** Global timeout for sequences (ms) */
  sequenceTimeout?: number;
  /** Prevent default browser behavior for matched bindings (default: true) */
  preventDefault?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

export interface KeySequenceInstance {
  /** Register a key binding */
  bind: (binding: KeyBinding) => () => void;
  /** Unregister a binding by ID */
  unbind: (id: string) => void;
  /** Register a key sequence */
  sequence: (seq: KeySequence) => () => void;
  /** Record a new key sequence */
  startRecording: () => { stop: () => void; getSequence: () => string[] };
  /** Play back a recorded macro */
  playMacro: (macro: Macro, target?: EventTarget) => Promise<void>;
  /** Get all registered bindings */
  getBindings: () => KeyBinding[];
  /** Get all registered sequences */
  getSequences: () => KeySequence[];
  /** Check if a key combo is currently pressed */
  isPressed: (key: string) => boolean;
  /** Destroy and remove all listeners */
  destroy: () => void;
}

// --- Internal ---

interface ParsedCombo {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

// --- Parsing ---

/** Parse a key combination string like "ctrl+shift+k" into components */
function parseCombo(combo: string): ParsedCombo {
  const parts = combo.toLowerCase().split("+").map((s) => s.trim());
  let key = "";
  let ctrl = false, alt = false, shift = false, meta = false;

  for (const part of parts) {
    switch (part) {
      case "ctrl": case "control": ctrl = true; break;
      case "alt": case "option": alt = true; break;
      case "shift": shift = true; break;
      case "meta": case "cmd": case "command": meta = true; break;
      case "mod": meta = navigator.platform?.includes("Mac") ?? false; ctrl = !meta; break;
      default: key = part.length === 1 ? part : part;
    }
  }

  return { key, ctrl, alt, shift, meta };
}

function normalizeKey(event: KeyboardEvent): string {
  return event.key.toLowerCase();
}

function eventMatchesCombo(event: KeyboardEvent, combo: ParsedCombo): boolean {
  if (normalizeKey(event) !== combo.key) return false;
  if (!!event.ctrlKey !== combo.ctrl) return false;
  if (!!event.altKey !== combo.alt) return false;
  if (!!event.shiftKey !== combo.shift) return false;
  if (!!event.metaKey !== combo.meta) return false;
  return true;
}

// --- Main Class ---

export function createKeySequenceManager(config: KeySequenceManagerConfig = {}): KeySequenceInstance {
  const {
    defaultScope = "always",
    sequenceTimeout = 1000,
    preventDefault = true,
    debug = false,
  } = config;

  const bindings: Map<string, KeyBinding> = new Map();
  const sequences: KeySequence[] = [];
  const pressedKeys = new Set<string>();
  let currentSequence: string[] = [];
  let sequenceTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  // --- Binding Management ---

  function bind(binding: KeyBinding): () => void {
    const resolved: KeyBinding = {
      ...binding,
      when: binding.when ?? defaultScope,
      enabled: binding.enabled !== false,
      priority: binding.priority ?? 0,
    };
    bindings.set(resolved.id, resolved);
    log(`Bound: ${resolved.id} -> ${resolved.keys}`);
    return () => unbind(resolved.id);
  }

  function unbind(id: string): void {
    bindings.delete(id);
    log(`Unbound: ${id}`);
  }

  // --- Sequence Management ---

  function sequence(seq: KeySequence): () => void {
    const resolved: KeySequence = { ...seq, timeout: seq.timeout ?? sequenceTimeout, enabled: seq.enabled !== false };
    sequences.push(resolved);
    return () => {
      const idx = sequences.indexOf(resolved);
      if (idx !== -1) sequences.splice(idx, 1);
    };
  }

  // --- Event Handling ---

  function handleKeyDown(e: KeyboardEvent): void {
    if (destroyed) return;

    const key = normalizeKey(e);
    pressedKeys.add(key);

    // Check single-key bindings
    const matchingBindings = Array.from(bindings.values())
      .filter((b) => b.enabled && isActive(b))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    for (const binding of matchingBindings) {
      const combo = parseCombo(binding.keys);
      if (eventMatchesCombo(e, combo)) {
        if (preventDefault) e.preventDefault();
        log(`Triggered binding: ${binding.id}`);
        binding.handler(e);
        return;
      }
    }

    // Check sequences
    currentSequence.push(key);
    resetSequenceTimer();

    for (const seq of sequences) {
      if (!seq.enabled) continue;
      if (matchesSequence(currentSequence, seq.steps)) {
        if (preventDefault) e.preventDefault();
        log(`Triggered sequence: ${seq.steps.join(" → ")}`);
        seq.handler(e);
        currentSequence = [];
        clearSequenceTimer();
        return;
      }
    }
  }

  function handleKeyUp(_e: KeyboardEvent): void {
    if (destroyed) return;
    // Could track released keys here
  }

  function matchesSequence(input: string[], pattern: string[]): boolean {
    if (input.length < pattern.length) return false;
    const tail = input.slice(-pattern.length);
    return tail.every((k, i) => k === pattern[i]);
  }

  function resetSequenceTimer(): void {
    clearSequenceTimer();
    sequenceTimer = setTimeout(() => {
      currentSequence = [];
    }, sequenceTimeout);
  }

  function clearSequenceTimer(): void {
    if (sequenceTimer) { clearTimeout(sequenceTimer); sequenceTimer = null; }
  }

  function isActive(binding: KeyBinding): boolean {
    switch (binding.when) {
      case "always": return true;
      case "focused":
        return document.activeElement === document.body ||
          document.activeElement?.getAttribute("contenteditable") === "true";
      case "editing":
        const tag = document.activeElement?.tagName;
        return tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.getAttribute("contenteditable") === "true";
      case "custom":
        return binding.whenFn?.() ?? true;
      default:
        return true;
    }
  }

  // --- Recording ---

  function startRecording(): { stop: () => void; getSequence: () => string[] } {
    const recorded: string[] = [];
    let listening = true;

    const recorder = (e: KeyboardEvent): void => {
      if (!listening) return;
      e.preventDefault();
      recorded.push(normalizeKey(e));
      log(`Recorded: ${normalizeKey(e)}`);
    };

    document.addEventListener("keydown", recorder);

    return {
      stop: () => { listening = false; document.removeEventListener("keydown", recorder); },
      getSequence: () => [...recorded],
    };
  }

  // --- Macro Playback ---

  async function playMacro(macro: Macro, target?: EventTarget): Promise<void> {
    const speed = macro.speed ?? 1;

    for (const step of macro.steps) {
      switch (step.type) {
        case "delay":
          await sleep(step.delayMs! / speed);
          break;
        case "keydown": {
          const event = new KeyboardEvent("keydown", {
            key: step.key,
            bubbles: true,
            cancelable: true,
          });
          (target ?? document).dispatchEvent(event);
          await sleep(50 / speed);
          break;
        }
        case "keyup": {
          const event = new KeyboardEvent("keyup", {
            key: step.key,
            bubbles: true,
            cancelable: true,
          });
          (target ?? document).dispatchEvent(event);
          await sleep(30 / speed);
          break;
        }
      }
    }
  }

  // --- Query ---

  function isPressed(key: string): boolean {
    return pressedKeys.has(key.toLowerCase());
  }

  function getBindings(): KeyBinding[] { return Array.from(bindings.values()); }
  function getSequences(): KeySequence[] { return [...sequences]; }

  // --- Lifecycle ---

  function destroy(): void {
    destroyed = true;
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
    clearSequenceTimer();
    bindings.clear();
    sequences.length = 0;
    pressedKeys.clear();
  }

  // --- Init ---

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);

  function log(...args: unknown[]): void {
    if (debug) console.log("[KeySequence]", ...args);
  }

  return { bind, unbind, sequence, startRecording, playMacro, getBindings, getSequences, isPressed, destroy };
}

// --- Helpers ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
