/**
 * Hotkey Parser Utilities: Parse keyboard shortcut strings into structured data,
 * normalize key names, detect conflicts, format for display, and compare
 * hotkey combinations.
 */

// --- Types ---

export interface ParsedHotkey {
  /** Original input string (normalized) */
  raw: string;
  /** Normalized key name (e.g., "k") */
  key: string;
  /** Display-friendly label (e.g., "⌘K") */
  display: string;
  /** HTML entity-safe display */
  displayHTML: string;
  /** Modifier keys in order: ctrl, alt, shift, meta */
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  /** Whether this is a valid parse */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Keyboard code for the main key */
  code?: string;
  /** Key location (standard/numpad) */
  location?: "standard" | "numpad" | "left" | "right";
}

export type ModifierKey = "ctrl" | "alt" | "shift" | "meta";

export interface HotkeyParseOptions {
  /** Treat Cmd/Meta as equivalent to Ctrl? Default true for cross-platform */
  cmdAsCtrl?: boolean;
  /** Separator between modifiers. Default "+" */
  separator?: string;
  /** Case-sensitive? Default false */
  caseSensitive?: boolean;
  /** Allow duplicate modifiers? Default false */
  allowDuplicates?: boolean;
  /** Platform-specific key map overrides */
  keyMap?: Record<string, string>;
}

export interface HotkeyCompareOptions {
  /** Ignore modifier differences? Default false */
  ignoreModifiers?: ModifierKey[];
  /** Compare only specific aspects? */
  compareKeyOnly?: boolean;
  /** Treat Shift+letter same as letter? Default true */
  ignoreShiftForLetters?: boolean;
  /** Case-insensitive key comparison? Default true */
  caseInsensitive?: boolean;
}

// --- Key Maps ---

const KEY_ALIASES: Record<string, string> = {
  // Arrow keys
  "arrowup": "ArrowUp",
  "arrowdown": "ArrowDown",
  "arrowleft": "ArrowLeft",
  "arrowright": "ArrowRight",
  // Navigation
  "pageup": "PageUp",
  "pagedown": "PageDown",
  "home": "Home",
  "end": "End",
  // Whitespace
  "space": " ",
  "tab": "Tab",
  "enter": "Enter",
  "return": "Enter",
  "escape": "Escape",
  "esc": "Escape",
  "backspace": "Backspace",
  "delete": "Delete",
  "del": "Delete",
  "insert": "Insert",
  // Function keys
  "f1": "F1", "f2": "F2", "f3": "F3", "f4": "F4", "f5": "F5",
  "f6": "F6", "f7": "F7", "f8": "F8", "f9": "F9", "f10": "F10",
  "f11": "F11", "f12": "F12",
  // Symbols
  "plus": "+", "minus": "-", "equals": "=", "comma": ", "period": ".",
  "slash": "/", "backslash": "\\", "pipe": "|",
  "semicolon": ";", "quote": "'", "backquote": "`",
  "bracketleft": "[", "bracketright": "]",
  "braceleft": "{", "braceright": "}",
  "parenleft": "(", "parenright": ")",
};

// Map of keyboard event codes to canonical key names
const CODE_TO_KEY: Record<string, string> = {
  "Digit0": "0", "Digit1": "1", "2": "2", "3": "3", "4": "4",
  "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
  "KeyA": "a", "KeyB": "b", "KeyC": "c", "KeyD": "d", "KeyE": "e",
  "KeyF": "f", "KeyG": "g", "KeyH": "h", "KeyI": "i", "KeyJ": "j",
  "KeyK": "k", "KeyL": "l", "KeyM": "m", "KeyN": "n", "KeyO": "o",
  "KeyP": "p", "KeyQ": "q", "KeyR": "r", "KeyS": "s", "KeyT": "t",
  "KeyU": "u", "KeyV": "v", "KeyW": "w", "KeyX": "x", "KeyY": "y",
  "KeyZ": "z",
  "Semicolon": ";", "Equal": "=", "Minus": "Slash": "/",
  "Backslash": "\\", "Backquote": "`", "Comma": ",  "Period": ".",
  "BracketLeft": "[", "BracketRight": "]", "Backspace": "Backspace",
  "Delete": "Delete", "Enter": "Enter", "Tab": "Tab",
  "Space": " ", "ArrowUp": "ArrowUp", "ArrowDown": "ArrowDown",
  "ArrowLeft": "ArrowLeft", "ArrowRight": "ArrowRight",
  "Home": "Home", "End": "End", "PageUp": "PageUp", "PageDown": "PageDown",
  "F1": "F1", "F2": "F2", "F3": "F3", "F4": "F4", "F5": "F5",
  "F6": "F6", "F7": "F7", "F8": "F8", "F9": "F9", "F10": "F10",
  "F11": "F11", "F12": "F12",
  "Escape": "Escape", "Numpad0": "0", "Numpad1": "1", "Numpad2": "2",
  "Numpad3": "3", "Numpad4": "4", "Numpad5": "5", "Numpad6": "6",
  "Numpad7": "7", "Numpad8": "8", "Numpad9": "9",
  "NumpadMultiply": "*", "NumpadAdd": "+", "NumpadDecimal": ".",
  "NumpadDivide": "/", "NumpadEnter": "Enter",
  "IntlBackslash": "\\", "IntlRo": "\\",
};

// Display symbols for modifiers
const MOD_SYMBOLS: Record<string, { symbol: string; html: string }> = {
  ctrl:  { symbol: "^", html: "&#94;" },
  alt:   { symbol: "~", html: "&#126;" },
  shift: { symbol: "\u21E7", html: "&#8679;" },
  meta:  { symbol: "\u2318", html: "&#8984;" },
};

// --- Parsing ---

/**
 * Parse a keyboard shortcut string into structured data.
 *
 * @example
 * ```ts
 * parseHotkey("Ctrl+Shift+K");
 * // => { key: "k", ctrl: true, shift: true, display: "^+⇧K", ... }
 *
 * parseHotkey("mod+p");
 * // => { key: "p", meta: true, display: "⌘P", ... }
 * ```
 */
export function parseHotkey(
  input: string,
  options: HotkeyParseOptions = {},
): ParsedHotkey {
  const {
    cmdAsCtrl = true,
    separator = "+",
    caseSensitive = false,
    allowDuplicates = false,
    keyMap,
  } = options;

  const raw = input.trim();
  if (!raw) return invalidResult(raw, "Empty input");

  const normalized = caseSensitive ? raw : raw.toLowerCase();
  const parts = normalized.split(separator);

  const modifiers: Set<ModifierKey> = new Set();
  let keyPart = "";
  let error: string | undefined;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!.trim();
    if (!part) continue;

    const lower = caseSensitive ? part : part.toLowerCase();

    if (lower === "ctrl" || lower === "control") {
      if (modifiers.has("ctrl") && !allowDuplicates) return invalidResult(raw, "Duplicate 'ctrl' modifier");
      modifiers.add("ctrl");
    } else if (lower === "alt" || lower === "option" || lower === "opt") {
      if (modifiers.has("alt") && !allowDuplicates) return invalidResult(raw, "Duplicate 'alt' modifier");
      modifiers.add("alt");
    } else if (lower === "shift") {
      if (modifiers.has("shift") && !allowDuplicates) return invalidResult(raw, "Duplicate 'shift' modifier");
      modifiers.add("shift");
    } else if (lower === "meta" || lower === "cmd" || lower === "command" || lower === "super") {
      if (modifiers.has("meta") && !allowDuplicates) return invalidResult(raw, "Duplicate 'meta' modifier");
      // Treat cmd as meta or as ctrl depending on option
      if (lower === "cmd" || lower === "command" && !cmdAsCtrl) {
        modifiers.add("meta");
      } else {
        modifiers.add("meta");
        // Also add ctrl for cross-platform compatibility
        if (cmdAsCtrl && (lower === "cmd" || lower === "command")) {
          modifiers.add("ctrl");
        }
      }
    } else if (keyPart) {
      // Already have a key — error
      return invalidResult(raw, `Multiple key parts found: "${keyPart}" and "${part}"`);
    } else {
      keyPart = part;
    }
  }

  if (!keyPart) return invalidResult(raw, "No key specified");

  // Resolve key alias
  const resolvedKey = (keyMap?.[keyPart] ?? KEY_ALIASES[keyPart] ?? keyPart).toLowerCase();

  // Single character — check it's a valid key
  const singleChar = resolvedKey.length === 1;
  if (!singleChar && !CODE_TO_KEY[resolvedKey] && !/^F\d{1,2}$/.test(resolvedKey)) {
    // Try case-sensitive lookup
    if (!CODE_TO_KEY[KEY_ALIASES[resolvedKey] ?? ""]) {
      return invalidResult(raw, `Unknown key: "${keyPart}"`);
    }
  }

  // Build display string
  const displayParts: string[] = [];
  const htmlParts: string[] = [];

  if (modifiers.has("ctrl")) {
    displayParts.push(MOD_SYMBOLS.ctrl.symbol);
    htmlParts.push(MOD_SYMBOLS.ctrl.html);
  }
  if (modifiers.has("alt")) {
    displayParts.push(MOD_SYMBOLS.alt.symbol);
    htmlParts.push(MOD_SYMBOLS.alt.html);
  }
  if (modifiers.has("shift")) {
    displayParts.push(MOD_SYMBOLS.shift.symbol);
    htmlParts.push(MOD_SYMBOLS.shift.html);
  }
  if (modifiers.has("meta")) {
    displayParts.push(MOD_SYMBOLS.meta.symbol);
    htmlParts.push(MOD_SYMBOLS.meta.html);
  }

  // Key display: uppercase for letters, symbolic for special keys
  const displayKey = resolvedKey.length === 1
    ? resolvedKey.toUpperCase()
    : (CODE_TO_KEY[resolvedKey] ?? resolvedKey);
  displayParts.push(displayKey);
  htmlParts.push(displayKey);

  return {
    raw,
    key: resolvedKey,
    display: displayParts.join("+"),
    displayHTML: htmlParts.join(""),
    ctrl: modifiers.has("ctrl"),
    alt: modifiers.has("alt"),
    shift: modifiers.has("shift"),
    meta: modifiers.has("meta"),
    valid: true,
    code: CODE_TO_KEY[resolvedKey],
  };
}

function invalidResult(raw: string, error: string): ParsedHotkey {
  return { raw, key: "", display: "", displayHTML: "", ctrl: false, alt: false, shift: false, meta: false, valid: false, error };
}

// --- Comparison ---

/**
 * Check if two parsed hotkeys are equivalent.
 */
export function hotkeysMatch(
  a: ParsedHotkey,
  b: ParsedHotkey,
  options: HotkeyCompareOptions = {},
): boolean {
  if (!a.valid || !b.valid) return false;

  const {
    ignoreModifiers = [],
    compareKeyOnly = false,
    ignoreShiftForLetters = true,
    caseInsensitive = true,
  } = options;

  // Key comparison
  if (caseInsensitive) {
    if (a.key.toLowerCase() !== b.key.toLowerCase()) return false;
  } else {
    if (a.key !== b.key) return false;
  }

  // Shift+letter == letter shortcut normalization
  if (ignoreShiftForLetters) {
    const aIsLetter = a.key.length === 1 && /^[a-zA-Z]$/.test(a.key);
    const bIsLetter = b.key.length === 1 && /^[a-zA-Z]$/.test(b.key);
    if (aIsLetter && bIsLetter && a.key.toLowerCase() === b.key.toLowerCase()) {
      // Match — just check other modifiers
    } else if ((aIsLetter && !b.shift) || (bIsLetter && !a.shift)) {
      // One has shift, other doesn't, but both are letters — still match
    }
  }

  if (compareKeyOnly) return true;

  // Modifier comparison
  const mods: ModifierKey[] = ["ctrl", "alt", "shift", "meta"];
  for (const mod of mods) {
    if (ignoreModifiers.includes(mod)) continue;
    if (a[mod] !== b[mod]) return false;
  }

  return true;
}

/**
 * Check if a keyboard event matches a parsed hotkey.
 */
export function eventMatchesHotkey(
  event: KeyboardEvent,
  hotkey: ParsedHotkey,
): boolean {
  if (!hotkey.valid) return false;

  const key = CODE_TO_KEY[event.code] ?? event.key.toLowerCase();

  // Key match
  if (key !== hotkey.key.toLowerCase()) {
    // Try shift-normalized
    if (event.key.toLowerCase() === hotkey.key.toLowerCase()) {
      // OK, key matches via event.key
    } else {
      return false;
    }
  }

  // Modifiers
  if (hotkey.ctrl && !(event.ctrlKey || event.metaKey)) return false;
  if (hotkey.alt && !event.altKey) return false;
  if (hotkey.shift && !event.shiftKey) return false;
  if (hotkey.meta && !event.metaKey) return false;

  return true;
}

// --- Formatting ---

/**
 * Format a parsed hotkey for platform-specific display.
 * Uses platform-appropriate symbols.
 */
export function formatHotkey(hotkey: ParsedHotkey, style: "short" | "full" | "mac" | "win" = "auto"): string {
  if (!hotkey.valid) return hotkey.raw || "(invalid)";

  switch (style) {
    case "mac":
      return formatMac(hotkey);
    case "win":
      return formatWin(hotkey);
    case "full":
      return hotkey.display;
    case "short": {
      // Compact: just modifiers + key
      const mods: string[] = [];
      if (hotkey.ctrl) mods.push("\u2303");
      if (hotkey.alt) mods.push("\u2325");
      if (hotkey.shift) modifers.push("\u21E7");
      if (hotkey.meta) mods.push("\u2318");
      mods.push(hotkey.key.toUpperCase());
      return mods.join("");
    }
    default:
      // Auto-detect platform
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      return isMac ? formatMac(hotkey) : formatWin(hotkey);
  }
}

function formatMac(hk: ParsedHotkey): string {
  const parts: string[] = [];
  if (hk.ctrl) parts.push("⌃");
  if (hk.alt) parts.push("⌥");
  if (hk.shift) parts.push("⇧");
  if (hk.meta) parts.push("⌘");
  parts.push(hk.key.length === 1 ? hk.key.toUpperCase() : hk.key);
  return parts.join("");
}

function formatWin(hk: ParsedHotkey): string {
  const parts: string[] = [];
  if (hk.ctrl) parts.push("Ctrl+");
  if (hk.alt) parts.push("Alt+");
  if (hk.shift) parts.push("Shift+");
  if (hk.meta) parts.push("Win+");
  parts.push(hk.key.length === 1 ? hk.key.toUpperCase() : hk.key);
  return parts.join("");
}

// --- Utility Functions ---

/**
 * Parse an array of hotkey strings at once.
 */
export function parseHotkeys(inputs: string[], options?: HotkeyParseOptions): ParsedHotkey[] {
  return inputs.map((s) => parseHotkey(s, options));
}

/**
 * Find conflicts between two sets of hotkeys.
 * Returns pairs of conflicting hotkeys.
 */
export function findConflicts(
  hotkeys: ParsedHotkey[],
): [ParsedHotkey, ParsedHotkey][] {
  const conflicts: [ParsedHotkey, ParsedHotkey][] = [];

  for (let i = 0; i < hotkeys.length; i++) {
    for (let j = i + 1; j < hotkeys.length; j++) {
      if (hotkeysMatch(hotkeys[i]!, hotkeys[j]!)) {
        conflicts.push([hotkeys[i]!, hotkeys[j]!]);
      }
    }
  }

  return conflicts;
}

/**
 * Convert a KeyboardEvent to a parsed hotkey representation.
 */
export function eventToHotkey(event: KeyboardEvent): ParsedHotkey {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push("ctrl");
  if (event.altKey) parts.push("alt");
  if (event.shiftKey) parts.push("shift");

  const key = CODE_TO_KEY[event.code] ?? event.key.toLowerCase();
  parts.push(key);

  return parseHotkey(parts.join("+"));
}

/**
 * Get a hash string for a hotkey (useful for Map keys).
 */
export function hotkeyHash(hotkey: ParsedHotkey): string {
  if (!hotkey.valid) return hotkey.raw;
  return [
    hotkey.ctrl ? "1" : "0",
    hotkey.alt ? "1" : "0",
    hotkey.shift ? "1" : "0",
    hotkey.meta ? "1" : "0",
    hotkey.key,
  ].join(":");
}
