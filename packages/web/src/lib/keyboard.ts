/**
 * Keyboard shortcut / hotkey manager: scoped key bindings, chord sequences,
 * conflict detection, modifier normalization, ARIA live region announcements,
 * and visual shortcut display formatting.
 */

// --- Types ---

export interface KeyBinding {
  /** Unique identifier */
  id: string;
  /** Primary key (e.g., "s", "Enter", "ArrowUp") */
  key: string;
  /** Ctrl/Cmd required? */
  ctrl?: boolean;
  /** Shift required? */
  shift?: boolean;
  /** Alt required? */
  alt?: boolean;
  /** Meta/Win required? */
  meta?: boolean;
  /** Display label (auto-generated if omitted) */
  label?: string;
  /** Description for help UI */
  description?: string;
  /** Category grouping */
  category?: string;
  /** Handler function */
  handler: (event: KeyboardEvent) => void;
  /** Prevent default browser behavior? */
  preventDefault?: boolean;
  /** Stop propagation? */
  stopPropagation?: boolean;
  /** Only fire when target matches selector? */
  when?: Element | string | (() => boolean);
  /** Scope this binding belongs to */
  scope?: string;
  /** Enable/disable */
  enabled?: boolean;
}

export interface KeyChord {
  /** Sequence of keys to press in order */
  sequence: Array<{ key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }>;
  /** Timeout between keystrokes (ms) */
  timeout?: number;
  /** Handler when full chord completed */
  handler: () => void;
  /** Label for display */
  label?: string;
  /** Description */
  description?: string;
}

export interface KeyboardManagerOptions {
  /** Default scope (default: "global") */
  defaultScope?: string;
  /** Announce shortcuts via ARIA live region? */
  announce?: boolean;
  /** Log conflicts to console? */
  logConflicts?: boolean;
  /** Ignore when user is typing in an input/textarea/contentEditable? */
  ignoreInputFields?: boolean;
  /** Custom element checker for "ignore input fields" logic */
  isInputElement?: (target: Element) => boolean;
}

export interface KeyboardManagerInstance {
  /** Register a key binding */
  bind: (binding: Omit<KeyBinding, "id">) => string;
  /** Register a chord sequence */
  bindChord: (chord: Omit<KeyChord, "label"> & { label?: string }) => string;
  /** Remove binding by ID */
  unbind: (id: string) => void;
  /** Remove all bindings in a scope */
  unbindScope: (scope: string) => void;
  /** Temporarily disable a binding */
  disable: (id: string) => void;
  /** Re-enable a disabled binding */
  enable: (id: string) => void;
  /** Switch active scope(s) */
  setScope: (scope: string | string[]) => void;
  /** Get current active scopes */
  getScope: () => string[];
  /** Get all registered bindings */
  getBindings: () => KeyBinding[];
  /** Get bindings filtered by category */
  getBindingsByCategory: () => Record<string, KeyBinding[]>;
  /** Check if a specific combo is bound */
  isBound: (key: string, ctrl?: boolean, shift?: boolean, alt?: boolean, meta?: boolean) => boolean;
  /** Simulate a key press (for testing) */
  simulate: (key: string, eventInit?: Partial<KeyboardEventInit>) => void;
  /** Format a binding for display (e.g., "Ctrl+S") */
  format: (binding: KeyBinding) => string;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

/** Normalize key name for consistent matching */
function normalizeKey(key: string): string {
  const map: Record<string, string> = {
    " ": "Space",
    "ArrowUp": "Up",
    "ArrowDown": "Down",
    "ArrowLeft": "Left",
    "ArrowRight": "Right",
    "+": "=",
    "-": "_",
  };
  return map[key] ?? key;
}

/** Build a signature string from key + modifiers for dedup/conflict detection */
function buildSignature(key: string, ctrl: boolean, shift: boolean, alt: boolean, meta: boolean): string {
  return [
    ctrl ? "C" : "",
    meta ? "M" : "",
    alt ? "A" : "",
    shift ? "S" : "",
    normalizeKey(key).toLowerCase(),
  ].join("");
}

/** Check if element is an input-like field */
function defaultIsInput(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  const isInput = tag === "input" || tag === "textarea" || tag === "select";
  const isContentEditable = el.getAttribute("contenteditable") === "true";
  return isInput || isContentEditable;
}

// --- Main Class ---

export class KeyboardManager {
  create(options: KeyboardManagerOptions = {}): KeyboardManagerInstance {
    let destroyed = false;
    const bindings = new Map<string, KeyBinding>();
    const chords = new Map<string, KeyChord & { id: string }>();
    let activeScopes: Set<string> = new Set(options.defaultScope ?? "global");
    const signatures = new Map<string, string>(); // signature -> bindingId

    // Chord state
    let activeChordSequence: Array<{ key: string; ctrl: boolean; shift: boolean; alt: boolean; meta: boolean }> = [];
    let chordTimer: ReturnType<typeof setTimeout> | null = null;

    // ARIA announcer
    let announcer: HTMLElement | null = null;

    // Options
    const announce = options.announce ?? false;
    const logConflicts = options.logConflicts ?? true;
    const ignoreInputFields = options.ignoreInputFields ?? true;
    const isInputChecker = options.isInputElement ?? defaultIsInput;

    // Create ARIA live region if announcing
    if (announce && typeof document !== "undefined") {
      announcer = document.createElement("div");
      announcer.setAttribute("aria-live", "polite");
      announcer.setAttribute("aria-atomic", "true");
      announcer.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";
      document.body.appendChild(announcer);
    }

    function announceAction(text: string): void {
      if (announcer) {
        announcer.textContent = text;
      }
    }

    // Keydown handler
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (destroyed) return;

      // Ignore input fields if configured
      if (ignoreInputFields && isInputChecker(event.target as Element)) return;

      const key = normalizeKey(event.key);
      const ctrl = event.ctrlKey || event.metaKey; // Treat Cmd as Ctrl on Mac
      const shift = event.shiftKey;
      const alt = event.altKey;
      const meta = event.metaKey;
      const signature = buildSignature(key, ctrl, shift, alt, meta);

      // Check chords first
      if (chords.size > 0) {
        activeChordSequence.push({ key, ctrl, shift, alt, meta });

        // Find matching chord
        const match = findMatchingChord(activeChordSequence);
        if (match) {
          // Full chord matched
          clearChordState();
          match.handler();
          announceAction(match.description ?? match.label ?? "Shortcut executed");
          if (bindings.get(match.id!)?.preventDefault !== false) {
            event.preventDefault();
          }
          return;
        }

        // Check if any partial match exists
        if (hasPartialChordMatch(activeChordSequence)) {
          // Reset timer
          if (chordTimer) clearTimeout(chordTimer);
          const firstChord = Array.from(chords.values())[0];
          chordTimer = setTimeout(() => {
            activeChordSequence = [];
          }, firstChord?.timeout ?? 1000);
          return; // Wait for next key
        } else {
          // No match, reset chord state
          clearChordState();
          // Fall through to regular bindings
        }
      }

      // Find matching binding
      const bindingId = signatures.get(signature);
      if (!bindingId) return;

      const binding = bindings.get(bindingId);
      if (!binding || binding.enabled === false) return;

      // Scope check
      if (binding.scope && !activeScopes.has(binding.scope)) return;

      // When condition check
      if (binding.when) {
        let whenResult = false;
        if (typeof binding.when === "function") {
          whenResult = binding.when();
        } else if (typeof binding.when === "string") {
          whenResult = !!document.querySelector(binding.when);
        } else {
          whenResult = binding.when === document.activeElement ||
                       (binding.when as Element).contains(document.activeElement);
        }
        if (!whenResult) return;
      }

      // Execute
      if (binding.preventDefault !== false) event.preventDefault();
      if (binding.stopPropagation) event.stopPropagation();

      binding.handler(event);
      announceAction(binding.description ?? `Executed ${binding.label ?? signature}`);
    };

    function findMatchingChord(
      seq: Array<{ key: string; ctrl: boolean; shift: boolean; alt: boolean; meta: boolean }>,
    ): (KeyChord & { id: string }) | undefined {
      for (const [, chord] of chords) {
        if (chord.sequence.length === seq.length) {
          const match = chord.sequence.every((step, i) =>
            step.key.toLowerCase() === seq[i]!.key.toLowerCase() &&
            !!step.ctrl === !!seq[i]!.ctrl &&
            !!step.shift === !!seq[i]!.shift &&
            !!step.alt === !!seq[i]!.alt &&
            !!step.meta === !!seq[i]!.meta,
          );
          if (match) return chord;
        }
      }
      return undefined;
    }

    function hasPartialChordMatch(
      seq: Array<{ key: string; ctrl: boolean; shift: boolean; alt: boolean; meta: boolean }>,
    ): boolean {
      for (const [, chord] of chords) {
        if (seq.length < chord.sequence.length) {
          const partialMatch = chord.sequence.every((step, i) =>
            step.key.toLowerCase() === seq[i]!.key.toLowerCase() &&
            !!step.ctrl === !!seq[i]!.ctrl &&
            !!step.shift === !!seq[i]!.shift &&
            !!step.alt === !!seq[i]!.alt &&
            !!step.meta === !!seq[i]!.meta,
          );
          if (partialMatch) return true;
        }
      }
      return false;
    }

    function clearChordState(): void {
      activeChordSequence = [];
      if (chordTimer) { clearTimeout(chordTimer); chordTimer = null; }
    }

    const instance: KeyboardManagerInstance = {

      bind(bindingConfig): string {
        const id = crypto.randomUUID();
        const key = normalizeKey(bindingConfig.key);
        const ctrl = bindingConfig.ctrl ?? false;
        const shift = bindingConfig.shift ?? false;
        const alt = bindingConfig.alt ?? false;
        const meta = bindingConfig.meta ?? false;

        const signature = buildSignature(key, ctrl, shift, alt, meta);

        // Conflict detection
        const existingId = signatures.get(signature);
        if (existingId && logConflicts) {
          const existing = bindings.get(existingId);
          console.warn(
            `[KeyboardManager] Conflict: "${signature}" already bound to "${existing?.description ?? existingId}". New binding "${bindingConfig.description ?? id}" will override.`,
          );
        }

        const binding: KeyBinding = {
          ...bindingConfig,
          key,
          id,
          ctrl, shift, alt, meta,
          preventDefault: bindingConfig.preventDefault ?? true,
          stopPropagation: bindingConfig.stopPropagation ?? false,
          enabled: bindingConfig.enabled ?? true,
          scope: bindingConfig.scope ?? options.defaultScope ?? "global",
          label: bindingConfig.label ?? formatSingle(key, ctrl, shift, alt, meta),
        };

        bindings.set(id, binding);
        signatures.set(signature, id);

        return id;
      },

      bindChord(chordConfig): string {
        const id = crypto.randomUUID();
        const chord: KeyChord & { id: string } = {
          ...chordConfig,
          id,
          sequence: chordConfig.sequence.map((s) => ({
            key: normalizeKey(s.key),
            ctrl: s.ctrl ?? false,
            shift: s.shift ?? false,
            alt: s.alt ?? false,
            meta: s.meta ?? false,
          })),
          timeout: chordConfig.timeout ?? 1000,
          label: chordConfig.label ?? chordConfig.sequence.map((s) =>
            formatSingle(normalizeKey(s.key), s.ctrl ?? false, s.shift ?? false, s.alt ?? false, s.meta ?? false),
          ).join(" "),
        };
        chords.set(id, chord);
        return id;
      },

      unbind(id: string): void {
        const binding = bindings.get(id);
        if (binding) {
          const sig = buildSignature(binding.key, binding.ctrl!, binding.shift!, binding.alt!, binding.meta!);
          signatures.delete(sig);
          bindings.delete(id);
        }
        chords.delete(id);
      },

      unbindScope(scope: string): void {
        for (const [id, binding] of bindings) {
          if (binding.scope === scope) {
            const sig = buildSignature(binding.key, binding.ctrl!, binding.shift!, binding.alt!, binding.meta!);
            signatures.delete(sig);
            bindings.delete(id);
          }
        }
      },

      disable(id: string): void {
        const b = bindings.get(id);
        if (b) b.enabled = false;
      },

      enable(id: string): void {
        const b = bindings.get(id);
        if (b) b.enabled = true;
      },

      setScope(scope: string | string[]): void {
        activeScopes = Array.isArray(scope) ? new Set(scope) : new Set([scope]);
      },

      getScope(): string[] {
        return Array.from(activeScopes);
      },

      getBindings(): KeyBinding[] {
        return Array.from(bindings.values());
      },

      getBindingsByCategory(): Record<string, KeyBinding[]> {
        const groups: Record<string, KeyBinding[]> = {};
        for (const binding of bindings.values()) {
          const cat = binding.category ?? "General";
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(binding);
        }
        return groups;
      },

      isBound(key, ctrl, shift, alt, meta): boolean {
        const sig = buildSignature(key, ctrl ?? false, shift ?? false, alt ?? false, meta ?? false);
        return signatures.has(sig);
      },

      simulate(key, eventInit?): void {
        const event = new KeyboardEvent("keydown", {
          key,
          code: key,
          ctrlKey: eventInit?.ctrlKey ?? false,
          shiftKey: eventInit?.shiftKey ?? false,
          altKey: eventInit?.altKey ?? false,
          metaKey: eventInit?.metaKey ?? false,
          bubbles: true,
        });
        document.dispatchEvent(event);
      },

      format(binding): string {
        return binding.label ?? formatSingle(
          binding.key, binding.ctrl ?? false, binding.shift ?? false,
          binding.alt ?? false, binding.meta ?? false,
        );
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;
        document.removeEventListener("keydown", handleKeyDown);
        bindings.clear();
        signatures.clear();
        chords.clear();
        clearChordState();
        if (announcer && announcer.parentNode) {
          announcer.parentNode.removeChild(announcer);
        }
      },
    };

    // Attach listener
    document.addEventListener("keydown", handleKeyDown);

    return instance;
  }
}

/** Convenience: create a keyboard manager */
export function createKeyboardManager(options?: KeyboardManagerOptions): KeyboardManagerInstance {
  return new KeyboardManager().create(options);
}

// --- Formatting ---

function formatSingle(
  key: string,
  ctrl: boolean,
  shift: boolean,
  alt: boolean,
  meta: boolean,
): string {
  const parts: string[] = [];
  if (ctrl) parts.push(isMac() ? "\u2318" : "Ctrl"); // Cmd symbol on Mac
  if (meta && !ctrl) parts.push(isMac() ? "\u2318" : "Win");
  if (alt) parts.push(isMac() ? "\u2325" : "Alt");   // Option symbol on Mac
  if (shift) parts.push(isMac() ? "\u21E7" : "Shift"); // Shift symbol on Mac
  parts.push(key === " " ? "Space" : key);
  return parts.join(isMac() ? "" : "+");
}

function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
}

/** Format shortcut for display (standalone utility) */
export function formatShortcut(shortcut: {
  key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean;
}): string {
  return formatSingle(
    shortcut.key,
    shortcut.ctrl ?? false,
    shortcut.shift ?? false,
    shortcut.alt ?? false,
    shortcut.meta ?? false,
  );
}

/** Check if a KeyboardEvent matches a key combination */
export function matchesShortcut(
  event: KeyboardEvent,
  combo: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean },
): boolean {
  const key = normalizeKey(event.key);
  return (
    key === normalizeKey(combo.key) &&
    !!event.ctrlKey === !!(combo.ctrl ?? false) &&
    !!event.shiftKey === !!(combo.shift ?? false) &&
    !!event.altKey === !!(combo.alt ?? false) &&
    !!event.metaKey === !!(combo.meta ?? false)
  );
}
