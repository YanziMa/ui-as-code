/**
 * Keyboard shortcut/hotkey management system with combo parsing, display formatting, and React integration.
 */

export interface HotkeyBinding {
  id: string;
  label: string;
  key: string; // e.g., "mod+s", "ctrl+shift+k"
  handler: (event: KeyboardEvent) => void;
  description?: string;
  category?: string;
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  when?: "keydown" | "keyup";
}

export interface ParsedKeyCombo {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  key: string;
}

/** Parse a key combination string like "ctrl+shift+k" into components */
export function parseKeyCombo(combo: string): ParsedKeyCombo {
  const parts = combo.toLowerCase().replace(/\s+/g, "").split("+");
  let ctrl = false, alt = false, shift = false, meta = false, key = "";

  for (const part of parts) {
    switch (part) {
      case "ctrl": case "control": ctrl = true; break;
      case "alt": case "option": alt = true; break;
      case "shift": shift = true; break;
      case "meta": case "cmd": case "command": meta = true; break;
      case "mod":
        meta = isMac(); ctrl = !meta; break;
      default: key = part; break;
    }
  }

  return { ctrl, alt, shift, meta, key };
}

function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
}

/** Check if a keyboard event matches a parsed combo */
export function eventMatchesCombo(event: KeyboardEvent, combo: ParsedKeyCombo): boolean {
  if (!!event.ctrlKey !== combo.ctrl) return false;
  if (!!event.altKey !== combo.alt) return false;
  if (!!event.shiftKey !== combo.shift) return false;
  if (!!event.metaKey !== combo.meta) return false;

  const ek = event.key.toLowerCase();
  return ek === combo.key || event.code?.toLowerCase() === `key${combo.key}`;
}

/** Format a key combo for display (e.g., "⌘S" on Mac, "Ctrl+S" on Windows) */
export function formatKeyDisplay(combo: string): string {
  const p = parseKeyCombo(combo);
  const parts: string[] = [];

  if (p.ctrl) parts.push(isMac() ? "\u2318" : "Ctrl");
  if (p.meta && !p.ctrl) parts.push("\u2318");
  if (p.alt) parts.push(isMac() ? "\u2325" : "Alt");
  if (p.shift) parts.push(isMac() ? "\u21E7" : "Shift");

  const names: Record<string, string> = {
    enter: "Enter", tab: "Tab", escape: "Esc",
    space: "Space", backspace: "\u2190", delete: "Delete",
    home: "Home", end: "End", pageup: "PgUp", pagedown: "PgDn",
    arrowup: "\u2191", arrowdown: "\u2193", arrowleft: "\u219C", arrowright: "\u2192",
  };
  parts.push(names[p.key] ?? p.key.toUpperCase());

  return isMac() ? parts.join("") : parts.join(" + ");
}

/** Main hotkey manager class */
export class HotkeyManager {
  private bindings = new Map<string, HotkeyBinding>();
  private listeners = new Set<(binding: HotkeyBinding, event: KeyboardEvent) => void>();
  private enabled = true;
  private boundHandler: ((e: KeyboardEvent) => void) | null = null;

  register(binding: HotkeyBinding): () => void {
    this.bindings.set(binding.id, { ...binding, enabled: binding.enabled !== false });
    if (!this.boundHandler) this.attach();
    return () => this.unregister(binding.id);
  }

  unregister(id: string): void {
    this.bindings.delete(id);
    if (this.bindings.size === 0) this.detach();
  }

  setEnabled(v: boolean): void { this.enabled = v; }
  setBindingEnabled(id: string, v: boolean): void {
    const b = this.bindings.get(id); if (b) b.enabled = v;
  }

  getBindingsByCategory(): Record<string, HotkeyBinding[]> {
    const g: Record<string, HotkeyBinding[]> = {};
    for (const [, b] of this.bindings) {
      const cat = b.category ?? "general";
      (g[cat] ??= []).push(b);
    }
    return g;
  }

  getAllBindings(): HotkeyBinding[] { return Array.from(this.bindings.values()); }
  isRegistered(combo: string): boolean {
    const target = parseKeyCombo(combo);
    for (const [, b] of this.bindings) {
      const bp = parseKeyCombo(b.key);
      if (bp.key === target.key && bp.ctrl === target.ctrl &&
          bp.alt === target.alt && bp.shift === target.shift && bp.meta === target.meta)
        return true;
    }
    return false;
  }
  exportBindings(): Array<{ id: string; key: string; label: string }> {
    return Array.from(this.bindings.values).map(b => ({ id: b.id, key: b.key, label: b.label }));
  }
  destroy(): void {
    this.detach(); this.bindings.clear(); this.listeners.clear();
  }

  subscribe(listener: (b: HotkeyBinding, e: KeyboardEvent) => void): () => void {
    this.listeners.add(listener); return () => this.listeners.delete(listener);
  }

  private attach(): void {
    if (typeof window === "undefined") return;
    this.boundHandler = (e: KeyboardEvent) => {
      if (!this.enabled) return;
      for (const [, binding] of this.bindings) {
        if (!binding.enabled || binding.when === "keyup") continue;
        const combo = parseKeyCombo(binding.key);
        if (eventMatchesCombo(e, combo)) {
          if (binding.preventDefault !== false) e.preventDefault();
          if (binding.stopPropagation) e.stopPropagation();
          try { binding.handler(e); } catch (err) { console.error(`Hotkey [${binding.id}]:`, err); }
          for (const l of this.listeners) try { l(binding, e); } catch {}
          return;
        }
      }
    };
    window.addEventListener("keydown", this.boundHandler);
  }

  private detach(): void {
    if (this.boundHandler) { window.removeEventListener("keydown", this.boundHandler); this.boundHandler = null; }
  }
}

/** Check if any modifier keys are held */
export function areModifiersDown(e: KeyboardEvent): boolean {
  return !!(e.ctrlKey || e.altKey || e.metaKey || e.shiftKey);
}
export function getModifierString(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl"); if (e.altKey) parts.push("Alt");
  if (e.metaKey) parts.push("Meta"); if (e.shiftKey) parts.push("Shift");
  return parts.join("+");
}

/** Create pre-configured app hotkeys manager */
export function createAppHotkeys(): HotkeyManager {
  return new HotkeyManager();
}
