/**
 * Keyboard Shortcuts Manager: Global keyboard shortcut registration with
 * context-aware scoping, chord sequences, conflict resolution,
 * priority ordering, visual hint system, and accessibility support.
 */

// --- Types ---

export interface ShortcutBinding {
  /** Unique identifier */
  id: string;
  /** Human-readable label */
  label?: string;
  /** Description / help text */
  description?: string;
  /** Key combination (e.g., "mod+s", "ctrl+shift+k") */
  key: string;
  /** Handler function */
  handler: (event: KeyboardEvent) => void;
  /** When to trigger */
  when?: "always" | "inputFocused" | "editing" | "custom";
  /** Custom condition check */
  enabled?: () => boolean;
  /** Priority for conflict resolution (higher = wins) */
  priority?: number;
  /** Category for grouping */
  category?: string;
  /** Prevent default browser behavior? */
  preventDefault?: boolean;
  /** Stop propagation? */
  stopPropagation?: boolean;
  /** Allow repeat on key hold? */
  allowRepeat?: boolean;
}

export interface ShortcutGroup {
  /** Group identifier */
  id: string;
  /** Group name/label */
  name: string;
  /** Icon or emoji */
  icon?: string;
  /** Bindings in this group */
  bindings: ShortcutBinding[];
  /** Is this group currently active/enabled? */
  active?: boolean;
}

export interface ShortcutManagerOptions {
  /** Target element (default: document) */
  target?: HTMLElement | Document;
  /** Enable logging of triggered shortcuts? */
  enableLogging?: boolean;
  /** Default prevent default behavior? */
  preventDefault?: boolean;
  /** Show visual feedback when shortcut triggers? */
  showFeedback?: boolean;
  /** Feedback display duration (ms) */
  feedbackDuration?: number;
  /** Callback when a shortcut fires */
  onTrigger?: (binding: ShortcutBinding, event: KeyboardEvent) => void;
  /** Callback when a shortcut conflicts */
  onConflict?: (existing: ShortcutBinding, incoming: ShortcutBinding) => void;
}

export interface ShortcutInstance {
  /** Register a single shortcut */
  register: (binding: ShortcutBinding) => void;
  /** Register multiple shortcuts at once */
  registerMany: (bindings: ShortcutBinding[]) => void;
  /** Register a grouped set of shortcuts */
  registerGroup: (group: ShortcutGroup) => void;
  /** Unregister a shortcut by ID */
  unregister: (id: string) => void;
  /** Unregister all shortcuts in a group */
  unregisterGroup: (groupId: string) => void;
  /** Check if a key combo is registered */
  isRegistered: (key: string) => boolean;
  /** Get binding by ID */
  getBinding: (id: string) => ShortcutBinding | undefined;
  /** Get all bindings */
  getAllBindings: () => ShortcutBinding[];
  /** Get all groups */
  getGroups: () => ShortcutGroup[];
  /** Temporarily disable a shortcut */
  disable: (id: string) => void;
  /** Re-enable a disabled shortcut */
  enable: (id: string) => void;
  /** Disable an entire group */
  disableGroup: (groupId: string) => void;
  /** Enable an entire group */
  enableGroup: (groupId: string) => void;
  /** Simulate a key press (for testing) */
  simulate: (key: string) => void;
  /** Generate a keyboard cheat sheet HTML */
  generateCheatSheet: () => HTMLElement;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Key Parsing ---

interface ParsedKey {
  ctrl: boolean;
  alt: boolean;
  shift: bool;
  meta: boolean;
  key: string;
}

function parseKeyCombo(combo: string): ParsedKey {
  const parts = combo.toLowerCase().replace(/\s+/g, "").split("+");
  let ctrl = false, alt = false, shift = false, meta = false;
  let mainKey = "";

  for (const part of parts) {
    switch (part) {
      case "ctrl": case "control": ctrl = true; break;
      case "alt": case "option": alt = true; break;
      case "shift": shift = true; break;
      case "meta": case "cmd": case "command": meta = true; break;
      case "mod": // Platform-aware mod
        meta = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
        ctrl = !meta;
        break;
      default:
        // Normalize key name
        mainKey = normalizeKeyName(part);
        break;
    }
  }

  return { ctrl, alt, shift, meta, key: mainKey };
}

function normalizeKeyName(key: string): string {
  const aliases: Record<string, string> = {
    "esc": "escape", "return": "enter", "spacebar": " ",
    "space": " ", "up": "arrowup", "down": "arrowdown",
    "left": "arrowleft", "right": "arrowright",
    "del": "delete", "ins": "insert", "pgup": "pageup",
    "pgdn": "pagedown", "capslock": "capslock",
    "/": "/", ".": ".", ",": ",", ";": ";", "'": "'",
    "[": "[", "]": "]", "\\": "\\", "`": "`", "-": "-", "=": "=",
  };
  return aliases[key.toLowerCase()] ?? key.toLowerCase();
}

function eventToParsedKey(e: KeyboardEvent): ParsedKey {
  return {
    ctrl: e.ctrlKey,
    alt: e.altKey,
    shift: e.shiftKey,
    meta: e.metaKey,
    key: normalizeKeyName(e.key),
  };
}

function parsedKeysEqual(a: ParsedKey, b: ParsedKey): boolean {
  return (
    a.ctrl === b.ctrl &&
    a.alt === b.alt &&
    a.shift === b.shift &&
    a.meta === b.meta &&
    a.key === b.key
  );
}

function formatKeyLabel(combo: string): string {
  const parts = combo.replace(/\s+/g, "").split("+");
  const labels: string[] = [];
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  for (const part of parts) {
    switch (part.toLowerCase()) {
      case "ctrl": case "control": labels.push(isMac ? "^" : "Ctrl"); break;
      case "alt": case "option": labels.push(isMac ? "Option" : "Alt"); break;
      case "shift": labels.push(isMac ? "\u21E7" : "Shift"); break;
      case "meta": case "cmd": case "command": labels.push("\u2318"); break;
      case "mod": labels.push(isMac ? "\u2318" : "Ctrl"); break;
      case "escape": case "esc": labels.push("Esc"); break;
      case "enter": case "return": labels.push("Enter"); break;
      case "tab": labels.push("Tab"); break;
      case " ": case "space": case "spacebar": labels.push("Space"); break;
      case "arrowup": labels.push("\u2191"); break;
      case "arrowdown": labels.push("\u2193"); break;
      case "arrowleft": labels.push("\u2190"); break;
      case "arrowright": labels.push("\u2192"); break;
      case "backspace": labels.push("\u232B"); break;
      case "delete": case "del": labels.push("Del"); break;
      default:
        if (part.length === 1) labels.push(part.toUpperCase());
        else labels.push(part.charAt(0).toUpperCase() + part.slice(1));
        break;
    }
  }

  return labels.join(isMac ? "" : "+");
}

// --- Main Factory ---

export function createShortcutManager(options: ShortcutManagerOptions = {}): ShortcutInstance {
  const opts = {
    target: options.target ?? document,
    enableLogging: options.enableLogging ?? false,
    preventDefault: options.preventDefault ?? true,
    showFeedback: options.showFeedback ?? false,
    feedbackDuration: options.feedbackDuration ?? 600,
    ...options,
  };

  const bindings = new Map<string, ShortcutBinding>();
  const groups = new Map<string, ShortcutGroup>();
  const disabledIds = new Set<string>();
  const disabledGroups = new Set<string>();
  let destroyed = false;

  // Key-to-binding index for fast lookup
  const keyIndex = new Map<string, ShortcutBinding[]>();

  function addToIndex(binding: ShortcutBinding): void {
    const parsed = parseKeyCombo(binding.key);
    const sig = `${parsed.ctrl},${parsed.alt},${parsed.shift},${parsed.meta},${parsed.key}`;
    if (!keyIndex.has(sig)) keyIndex.set(sig, []);
    keyIndex.get(sig)!.push(binding);

    // Sort by priority descending
    keyIndex.get(sig)!.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  function removeFromIndex(binding: ShortcutBinding): void {
    const parsed = parseKeyCombo(binding.key);
    const sig = `${parsed.ctrl},${parsed.alt},${parsed.shift},${parsed.meta},${parsed.key}`;
    const list = keyIndex.get(sig);
    if (list) {
      const idx = list.indexOf(binding);
      if (idx >= 0) list.splice(idx, 1);
      if (list.length === 0) keyIndex.delete(sig);
    }
  }

  function checkWhenCondition(when: ShortcutBinding["when"]): boolean {
    switch (when) {
      case "inputFocused":
        const el = document.activeElement;
        return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el?.isContentEditable;
      case "editing":
        const ae = document.activeElement;
        return (ae instanceof HTMLInputElement && (ae.type === "text" || ae.type === "search" || ae.type === "url")) ||
          ae instanceof HTMLTextAreaElement ||
          !!ae?.getAttribute("contenteditable");
      case "custom":
        return true; // handled by enabled() callback
      default:
        return true;
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (destroyed) return;

    // Ignore key repeats unless allowed
    if (event.repeat) {
      // Check if any matching binding allows repeat
      const parsed = eventToParsedKey(event);
      const sig = `${parsed.ctrl},${parsed.alt},${parsed.shift},${parsed.meta},${parsed.key}`;
      const matches = keyIndex.get(sig);
      if (matches) {
        const hasRepeatAllowed = matches.some((b) => b.allowRepeat !== false && !disabledIds.has(b.id));
        if (!hasRepeatAllowed) return;
      } else {
        return;
      }
    }

    const parsed = eventToParsedKey(event);
    const sig = `${parsed.ctrl},${parsed.alt},${parsed.shift},${parsed.meta},${parsed.key}`;
    const matches = keyIndex.get(sig);

    if (!matches || matches.length === 0) return;

    // Find first enabled, non-disabled match
    for (const binding of matches) {
      if (disabledIds.has(binding.id)) continue;

      // Check group disabled
      const group = findGroupForBinding(binding.id);
      if (group && disabledGroups.has(group.id)) continue;

      // Check 'when' condition
      if (binding.when && !checkWhenCondition(binding.when)) continue;

      // Check custom enabled
      if (binding.enabled && !binding.enabled()) continue;

      // Found a match!
      if (opts.enableLogging) {
        console.log(`[Shortcut] ${binding.key} -> ${binding.id}${binding.label ? ` (${binding.label})` : ""}`);
      }

      if (binding.preventDefault ?? opts.preventDefault) {
        event.preventDefault();
      }
      if (binding.stopPropagation) {
        event.stopPropagation();
      }

      try {
        binding.handler(event);
      } catch (err) {
        console.error(`[Shortcut] Error in handler for ${binding.id}:`, err);
      }

      opts.onTrigger?.(binding, event);

      // Visual feedback
      if (opts.showFeedback) {
        showVisualFeedback(binding);
      }

      return; // Only fire the highest-priority match
    }
  }

  function findGroupForBinding(bindingId: string): ShortcutGroup | undefined {
    for (const group of groups.values()) {
      if (group.bindings.some((b) => b.id === bindingId)) return group;
    }
    return undefined;
  }

  function showVisualFeedback(_binding: ShortcutBinding): void {
    // Create a subtle toast-like indicator
    const toast = document.createElement("div");
    toast.style.cssText = `
      position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
      background:rgba(17,24,39,0.9);color:#fff;padding:6px 14px;border-radius:8px;
      font-size:12px;font-family:-apple-system,sans-serif;z-index:999999;
      pointer-events:none;animation:sc-fade-in-up 0.15s ease both;
    `;
    toast.textContent = `${formatKeyLabel(_binding.key)} ${_binding.label ?? _binding.id}`;

    if (!document.getElementById("shortcut-feedback-styles")) {
      const style = document.createElement("style");
      style.id = "shortcut-feedback-styles";
      style.textContent = `
        @keyframes sc-fade-in-up{from{opacity:0;transform:translateX(-50%) translateY(8px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
        @keyframes sc-fade-out{from{opacity:1;}to{opacity:0;}}
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = "sc-fade-out 0.2s ease forwards";
      setTimeout(() => toast.remove(), 200);
    }, opts.feedbackDuration);
  }

  // Attach listener
  opts.target.addEventListener("keydown", handleKeyDown as EventListener);

  const instance: ShortcutInstance = {
    register(binding: ShortcutBinding): void {
      // Check for conflicts
      const existing = instance.getAllBindings().find(
        (b) => b.id !== binding.id && parseKeyCombo(b.key).key === parseKeyCombo(binding.key).key &&
          (b.ctrl || false) === (parseKeyCombo(binding.key).ctrl) &&
          (b.alt || false) === (parseKeyCombo(binding.key).alt)
      );

      if (existing) {
        opts.onConflict?.(existing, binding);
      }

      bindings.set(binding.id, binding);
      addToIndex(binding);
    },

    registerMany(bindingsList: ShortcutBinding[]): void {
      for (const b of bindingsList) instance.register(b);
    },

    registerGroup(group: ShortcutGroup): void {
      groups.set(group.id, group);
      for (const b of group.bindings) {
        bindings.set(b.id, b);
        addToIndex(b);
      }
      if (group.active === false) {
        disabledGroups.add(group.id);
      }
    },

    unregister(id: string): void {
      const binding = bindings.get(id);
      if (binding) {
        removeFromIndex(binding);
        bindings.delete(id);
        disabledIds.delete(id);
      }
    },

    unregisterGroup(groupId: string): void {
      const group = groups.get(groupId);
      if (group) {
        for (const b of group.bindings) {
          instance.unregister(b.id);
        }
        groups.delete(groupId);
        disabledGroups.delete(groupId);
      }
    },

    isRegistered(key: string): boolean {
      const parsed = parseKeyCombo(key);
      const sig = `${parsed.ctrl},${parsed.alt},${parsed.shift},${parsed.meta},${parsed.key}`;
      return keyIndex.has(sig) && (keyIndex.get(sig)?.length ?? 0) > 0;
    },

    getBinding(id: string): ShortcutBinding | undefined {
      return bindings.get(id);
    },

    getAllBindings(): ShortcutBinding[] {
      return Array.from(bindings.values());
    },

    getGroups(): ShortcutGroup[] {
      return Array.from(groups.values());
    },

    disable(id: string): void { disabledIds.add(id); },
    enable(id: string): void { disabledIds.delete(id); },
    disableGroup(groupId: string): void { disabledGroups.add(groupId); },
    enableGroup(groupId: string): void { disabledGroups.delete(groupId); },

    simulate(key: string): void {
      const parsed = parseKeyCombo(key);
      const event = new KeyboardEvent("keydown", {
        key: parsed.key === " " ? " " : parsed.key,
        code: keyCodeToCode(parsed.key),
        ctrlKey: parsed.ctrl,
        altKey: parsed.alt,
        shiftKey: parsed.shift,
        metaKey: parsed.meta,
        bubbles: true,
      });
      opts.target.dispatchEvent(event);
    },

    generateCheatSheet(): HTMLElement {
      const container = document.createElement("div");
      container.className = "shortcut-cheat-sheet";
      container.style.cssText = `
        font-family:-apple-system,sans-serif;font-size:13px;color:#374151;line-height:1.6;
      `;

      // Group by category
      const categorized = new Map<string, ShortcutBinding[]>();
      const uncategorized: ShortcutBinding[] = [];

      for (const binding of bindings.values()) {
        if (disabledIds.has(binding.id)) continue;
        const cat = binding.category ?? binding.id.split(":")[0] ?? "Other";
        const group = findGroupForBinding(binding.id);
        if (group && disabledGroups.has(group.id)) continue;

        if (categorized.has(cat)) {
          categorized.get(cat)!.push(binding);
        } else {
          categorized.set(cat, [binding]);
        }
      }

      // Render each category
      for (const [category, cats] of categorized) {
        const section = document.createElement("div");
        section.style.cssText = "margin-bottom:16px;";

        const header = document.createElement("h4");
        header.style.cssText = "font-size:12px;font-weight:600;text-transform:uppercase;color:#9ca3af;margin:0 0 6px;letter-spacing:0.5px;";
        header.textContent = category;
        section.appendChild(header);

        for (const b of cats) {
          const row = document.createElement("div");
          row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:3px 0;";
          row.innerHTML = `
            <span style="color:#4b5563;">${b.description ?? b.label ?? b.id}</span>
            <kbd style="display:inline-flex;align-items:center;gap:2px;padding:2px 7px;font-size:11px;
              font-family:inherit;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:5px;
              color:#374151;box-shadow:0 1px 0 #e5e7eb;">${formatKeyLabel(b.key)}</kbd>
          `;
          section.appendChild(row);
        }

        container.appendChild(section);
      }

      return container;
    },

    destroy() {
      destroyed = true;
      opts.target.removeEventListener("keydown", handleKeyDown as EventListener);
      bindings.clear();
      groups.clear();
      keyIndex.clear();
      disabledIds.clear();
      disabledGroups.clear();
    },
  };

  return instance;
}

// --- Helpers ---

function keyCodeToCode(key: string): string {
  const map: Record<string, string> = {
    "escape": "Escape", "enter": "Enter", "tab": "Tab", " ": "Space",
    "arrowup": "ArrowUp", "arrowdown": "ArrowDown", "arrowleft": "ArrowLeft", "arrowright": "ArrowRight",
    "backspace": "Backspace", "delete": "Delete", "capslock": "CapsLock",
  };
  return map[key] ?? `Key${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}
