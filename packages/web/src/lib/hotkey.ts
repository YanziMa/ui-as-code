/**
 * Hotkey / Keyboard Shortcut: Display component for keyboard shortcuts,
 * global hotkey binding manager, key combination parsing, conflict detection,
 * visual rendering of key chords, and accessibility support.
 */

// --- Types ---

export interface KeyCombo {
  /** Main key (e.g., "k", "Enter", "ArrowUp") */
  key: string;
  /** Ctrl modifier */
  ctrl?: boolean;
  /** Alt/Option modifier */
  alt?: boolean;
  /** Shift modifier */
  shift?: boolean;
  /** Meta/Cmd/Win modifier */
  meta?: boolean;
}

export type HotkeyVariant = "default" | "compact" | "inline" | "badge";

export interface HotkeyDisplayOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Key combination to display */
  combo: KeyCombo | string;
  /** Display variant */
  variant?: HotkeyVariant;
  /** Show as pressed/active state */
  active?: boolean;
  /** Custom label override */
  label?: string;
  /** Description text */
  description?: string;
  /** Callback on click (to trigger the action) */
  onClick?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface HotkeyDisplayInstance {
  element: HTMLElement;
  setCombo: (combo: KeyCombo | string) => void;
  setActive: (active: boolean) => void;
  destroy: () => void;
}

export interface HotkeyBinding {
  /** Unique identifier */
  id: string;
  /** Key combination */
  combo: KeyCombo | string;
  /** Display label */
  label: string;
  /** Description */
  description?: string;
  /** Action handler */
  handler: (e: KeyboardEvent) => void;
  /** Enable when inside this element scope */
  scope?: HTMLElement | string;
  /** Disabled? */
  disabled?: boolean;
  /** Priority (higher = first to handle) */
  priority?: number;
}

export interface HotkeyManagerOptions {
  /** Global bindings */
  bindings?: HotkeyBinding[];
  /** Prevent default browser behavior for handled keys */
  preventDefault?: boolean;
  /** Log debug info */
  debug?: boolean;
  /** Callback when a hotkey fires */
  onFire?: (binding: HotkeyBinding, e: KeyboardEvent) => void;
  /** Callback on conflict detection */
  onConflict?: (a: HotkeyBinding, b: HotkeyBinding) => void;
}

export interface HotkeyManagerInstance {
  /** Register a binding */
  register: (binding: HotkeyBinding) => () => void;
  /** Unregister by ID */
  unregister: (id: string) => void;
  /** Check if a combo is already bound */
  isBound: (combo: KeyCombo) => HotkeyBinding | null;
  /** Get all registered bindings */
  getBindings: () => HotkeyBinding[];
  /** Pause all handlers */
  pause: () => void;
  /** Resume all handlers */
  resume: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Parsing ---

/** Parse a hotkey string like "Ctrl+K" into a KeyCombo */
export function parseHotkey(combo: string): KeyCombo {
  const parts = combo.split("+").map((p) => p.trim().toLowerCase());
  const result: KeyCombo = { key: "" };

  const modifiers = new Set<string>();
  const keyParts: string[] = [];

  for (const part of parts) {
    if (part === "ctrl" || part === "control") { result.ctrl = true; modifiers.add(part); }
    else if (part === "alt" || part === "option") { result.alt = true; modifiers.add(part); }
    else if (part === "shift") { result.shift = true; modifiers.add(part); }
    else if (part === "meta" || part === "cmd" || part === "super" || part === "win") { result.meta = true; modifiers.add(part); }
    else { keyParts.push(part); }
  }

  // Reconstruct key (handle multi-word keys like "arrowup", "arrow up")
  result.key = keyParts.length > 0 ? keyParts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("") : "";

  return result;
}

/** Format a KeyCombo back to a display string */
export function formatHotkey(combo: KeyCombo): string {
  const parts: string[] = [];
  if (combo.ctrl) parts.push("Ctrl");
  if (combo.alt) parts.push("Alt");
  if (combo.shift) parts.push("Shift");
  if (combo.meta) parts.push("Cmd");
  parts.push(combo.key);
  return parts.join("+");
}

/** Normalize a key name for consistent display */
export function normalizeKeyName(key: string): string {
  const aliases: Record<string, string> = {
    arrowup: "Up",
    arrowdown: "Down",
    arrowleft: "Left",
    arrowright: "Right",
    enter: "Return",
    " ": "Space",
    escape: "Esc",
    tab: "Tab",
    backspace: "Backspace",
    delete: "Del",
    pageup: "Page Up",
   pagedown: "Page Down",
    home: "Home",
    end: "End",
  };
  const lower = key.toLowerCase();
  return aliases[lower] ?? (key.length === 1 ? key.toUpperCase() : key);
}

/** Check if a KeyboardEvent matches a KeyCombo */
export function matchesKeyEvent(e: KeyboardEvent, combo: KeyCombo): boolean {
  if (e.key.toLowerCase() !== combo.key.toLowerCase()) return false;
  if (!!e.ctrlKey !== !!combo.ctrl) return false;
  if (!!e.altKey !== !!combo.alt) return false;
  if (!!e.shiftKey !== !!combo.shift) return false;
  if (!!e.metaKey !== !!combo.meta) return false;
  return true;
}

/** Compare two combos for equality */
export function combosEqual(a: KeyCombo, b: KeyCombo): boolean {
  return (
    a.key.toLowerCase() === b.key.toLowerCase() &&
    !!a.ctrl === !!b.ctrl &&
    !!a.alt === !!b.alt &&
    !!a.shift === !!b.shift &&
    !!a.meta === !!b.meta
  );
}

// --- Display Component ---

const KEY_LABELS: Record<string, string> = {
  ctrl: "Ctrl", control: "Ctrl", alt: "Alt", option: "Opt",
  shift: "Shift", meta: "Cmd", super: "Cmd", win: "Win",
  enter: "Return", escape: "Esc", arrowup: "\u2191", arrowdown: "\u2193",
  arrowleft: "\u2190", arrowright: "\u2192", tab: "Tab",
  backspace: "\u232B", delete: "Del", space: "Space",
  pageup: "PgUp", pagedown: "PgDn", home: "Home", end: "End",
};

function getKeyLabel(key: string): string {
  const lower = key.toLowerCase();
  if (KEY_LABELS[lower]) return KEY_LABELS[lower];
  if (key.length <= 2) return key.toUpperCase();
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function createHotkeyDisplay(options: HotkeyDisplayOptions): HotkeyDisplayInstance {
  const opts = {
    variant: options.variant ?? "default",
    active: options.active ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("HotkeyDisplay: container not found");

  const combo = typeof opts.combo === "string" ? parseHotkey(opts.combo) : opts.combo;

  let destroyed = false;

  // Root element
  const root = document.createElement("span");
  root.className = `hotkey ${opts.className}`;
  root.style.cssText = `
    display:inline-flex;align-items:center;gap:2px;font-family:'SF Mono',Consolas,monospace,-apple-system,sans-serif;
    cursor:${opts.onClick ? "pointer" : "default"};
    vertical-align:middle;line-height:1;
  `;
  if (opts.onClick) {
    root.addEventListener("click", () => opts.onClick!());
    root.addEventListener("mouseenter", () => { root.style.opacity = "0.8"; });
    root.addEventListener("mouseleave", () => { root.style.opacity = ""; });
  }

  container.appendChild(root);

  function render(combo: KeyCombo): void {
    root.innerHTML = "";
    const keys: string[] = [];
    if (combo.ctrl) keys.push("ctrl");
    if (combo.alt) keys.push("alt");
    if (combo.shift) keys.push("shift");
    if (combo.meta) keys.push("meta");
    keys.push(combo.key);

    switch (opts.variant) {
      case "compact":
        for (let i = 0; i < keys.length; i++) {
          const k = document.createElement("kbd");
          k.className = "hk-key";
          k.textContent = getKeyLabel(keys[i]);
          k.style.cssText = `
            font-size:10px;padding:1px 4px;border:1px solid #d1d5db;border-radius:3px;
            background:#f9fafb;color:#374151;line-height:1.4;white-space:nowrap;
          `;
          root.appendChild(k);
          if (i < keys.length - 1) {
            const plus = document.createElement("span");
            plus.textContent = "+";
            plus.style.cssText = "font-size:8px;color:#9ca3af;margin:0 1px;";
            root.appendChild(plus);
          }
        }
        break;

      case "inline":
        root.textContent = formatHotkey(combo);
        root.style.cssText += `font-size:12px;color:#6b7280;font-family:inherit;`;
        break;

      case "badge":
        root.style.cssText += `
          padding:2px 8px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:4px;
          font-size:11px;color:#4b5563;
        `;
        for (let i = 0; i < keys.length; i++) {
          const k = document.createElement("kbd");
          k.className = "hk-key";
          k.textContent = getKeyLabel(keys[i]);
          k.style.cssText = `
            font-size:10px;padding:0 3px;border-radius:2px;
            ${i < keys.length - 1 ? "border-right:1px solid #d1d5db;margin-right:3px;" : ""}
            line-height:1.4;
          `;
          root.appendChild(k);
        }
        break;

      default: {
        // Default: styled kbd elements
        for (let i = 0; i < keys.length; i++) {
          const k = document.createElement("kbd");
          k.className = "hk-key";
          k.textContent = getKeyLabel(keys[i]);
          const isMod = ["ctrl", "alt", "shift", "meta"].includes(keys[i].toLowerCase());
          k.style.cssText = `
            display:inline-flex;align-items:center;justify-content:center;
            min-width:20px;height:22px;padding:0 6px;
            border:1px solid ${opts.active ? "#a5b4fc" : "#d1d5db"};
            border-radius:4px;
            background:${opts.active ? "#eef2ff" : "#fff"};
            color:${opts.active ? "#4338ca" : "#374151"};
            font-size:11px;font-weight:500;
            box-shadow:0 1px 2px rgba(0,0,0,0.05);
            line-height:1;${isMod ? "font-size:10px;text-transform:uppercase;" : ""}
          `;
          root.appendChild(k);
        }
        break;
      }
    }

    // Description
    if (opts.description && opts.variant !== "inline") {
      const desc = document.createElement("span");
      desc.className = "hk-desc";
      desc.textContent = opts.description;
      desc.style.cssText = "margin-left:6px;font-size:12px;color:#9ca3af;font-family:-apple-system,sans-serif;";
      root.appendChild(desc);
    }
  }

  render(combo);

  const instance: HotkeyDisplayInstance = {
    element: root,

    setCombo(newCombo: string | KeyCombo) {
      render(typeof newCombo === "string" ? parseHotkey(newCombo) : newCombo);
    },

    setActive(active: boolean) {
      opts.active = active;
      render(typeof opts.combo === "string" ? parseHotkey(opts.combo) : opts.combo);
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}

// --- Binding Manager ---

export function createHotkeyManager(options: HotkeyManagerOptions = {}): HotkeyManagerInstance {
  const opts = {
    preventDefault: options.preventDefault ?? true,
    debug: options.debug ?? false,
    ...options,
  };

  const bindings = new Map<string, HotkeyBinding>();
  const parsedCombos = new Map<string, KeyCombo>();
  let paused = false;
  let destroyed = false;

  function resolveScope(scope?: HTMLElement | string): HTMLElement | null {
    if (!scope) return null;
    return typeof scope === "string" ? document.querySelector<HTMLElement>(scope) : scope;
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (paused || destroyed) return;

    // Find matching binding (highest priority first)
    let bestMatch: { binding: HotkeyBinding; parsed: KeyCombo } | null = null;

    for (const [, binding] of bindings) {
      if (binding.disabled) continue;

      // Scope check
      const scopeEl = resolveScope(binding.scope);
      if (scopeEl && !scopeEl.contains(e.target as Node)) continue;

      const parsed = parsedCombos.get(binding.id)!;
      if (matchesKeyEvent(e, parsed)) {
        if (!bestMatch || (bestMatch.binding.priority ?? 0) <= (binding.priority ?? 0)) {
          bestMatch = { binding, parsed };
        }
      }
    }

    if (bestMatch) {
      if (opts.preventDefault) e.preventDefault();
      if (opts.debug) console.log(`[Hotkey] Fired: ${formatHotkey(bestMatch.parsed)} -> ${bestMatch.binding.label}`);
      opts.onFire?.(bestMatch.binding, e);
      try { bestMatch.binding.handler(e); } catch (err) {
        console.error(`[Hotkey] Error in handler for ${bestMatch.binding.id}:`, err);
      }
    }
  }

  // Register listener
  document.addEventListener("keydown", handleKeyDown);

  const instance: HotkeyManagerInstance = {
    register(binding: HotkeyBinding): () => void {
      // Parse and cache
      const parsed = typeof binding.combo === "string" ? parseHotkey(binding.combo) : binding.combo;
      parsedCombos.set(binding.id, parsed);

      // Conflict detection
      for (const [, existing] of bindings) {
        if (existing.id !== binding.id && !existing.disabled && !binding.disabled) {
          const existingParsed = parsedCombos.get(existing.id)!;
          if (combosEqual(parsed, existingParsed)) {
            opts.onConflict?.(binding, existing);
          }
        }
      }

      bindings.set(binding.id, binding);
      if (opts.debug) console.log(`[Hotkey] Registered: ${formatHotkey(parsed)} (${binding.label})`);

      // Return unregister function
      return () => { instance.unregister(binding.id); };
    },

    unregister(id: string): void {
      bindings.delete(id);
      parsedCombos.delete(id);
    },

    isBound(combo: KeyCombo): HotkeyBinding | null {
      for (const [, binding] of bindings) {
        const parsed = parsedCombos.get(binding.id);
        if (parsed && combosEqual(combo, parsed)) return binding;
      }
      return null;
    },

    getBindings(): HotkeyBinding[] {
      return Array.from(bindings.values());
    },

    pause() { paused = true; },
    resume() { paused = false; },

    destroy() {
      destroyed = true;
      document.removeEventListener("keydown", handleKeyDown);
      bindings.clear();
      parsedCombos.clear();
    },
  };

  // Register initial bindings
  if (options.bindings) {
    for (const b of options.bindings) instance.register(b);
  }

  return instance;
}
