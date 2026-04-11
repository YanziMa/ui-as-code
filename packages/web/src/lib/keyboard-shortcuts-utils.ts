/**
 * Keyboard Shortcuts Utilities: Global keyboard shortcut manager with
 * scope support, conflict detection, priority ordering, chord sequences,
 * visual hint overlay, and import/export of bindings.
 */

// --- Types ---

export type ModifierKey = "ctrl" | "alt" | "shift" | "meta";
export type ShortcutScope = "global" | "input" | "modal" | "custom";

export interface ShortcutBinding {
  /** Unique identifier */
  id: string;
  /** Display label (e.g., "Save") */
  label: string;
  /** Key code (e.g., "s", "Enter", "F1") */
  key: string;
  /** Required modifiers */
  modifiers?: ModifierKey[];
  /** When this shortcut is active */
  scope?: ShortcutScope;
  /** Handler function */
  handler: (e: KeyboardEvent) => void;
  /** Description for help UI */
  description?: string;
  /** Priority (higher = wins conflicts, default 0) */
  priority?: number;
  /** Is this enabled? */
  enabled?: boolean;
  /** Prevent default browser action? (default true) */
  preventDefault?: boolean;
  /** Category for grouping in help UI */
  category?: string;
}

export interface ShortcutGroup {
  /** Group name */
  name: string;
  /** Category identifier */
  category: string;
  /** Bindings in this group */
  bindings: ShortcutBinding[];
}

export interface KeyboardShortcutsOptions {
  /** Target element to attach listener (default document) */
  target?: EventTarget;
  /** Enable debug logging? */
  debug?: boolean;
  /** Default scope */
  defaultScope?: ShortcutScope;
  /** Called when a shortcut fires */
  onFire?: (binding: ShortcutBinding, event: KeyboardEvent) => void;
  /** Called when a conflict is detected */
  onConflict?: (a: ShortcutBinding, b: ShortcutBinding) => void;
  /** Show visual hint on first use? */
  showHints?: boolean;
  /** Hint display duration in ms (default 2000) */
  hintDuration?: number;
  /** Custom class name */
  className?: string;
}

export interface KeyboardShortcutsInstance {
  /** Register a shortcut binding */
  register: (binding: ShortcutBinding) => void;
  /** Unregister by ID */
  unregister: (id: string) => void;
  /** Register a group of shortcuts */
  registerGroup: (group: ShortcutGroup) => void;
  /** Unregister entire group by name */
  unregisterGroup: (name: string) => void;
  /** Check if a shortcut exists */
  has: (id: string) => boolean;
  /** Get a binding by ID */
  get: (id: string) => ShortcutBinding | undefined;
  /** Get all bindings (optionally filtered by scope/category) */
  getAll: (filter?: { scope?: ShortcutScope; category?: string }) => ShortcutBinding[];
  /** Enable/disable a shortcut */
  setEnabled: (id: string, enabled: boolean) => void;
  /** Set active scope */
  setScope: (scope: ShortcutScope) => void;
  /** Get current scope */
  getScope: () => ShortcutScope;
  /** Temporarily disable all shortcuts */
  pause: () => void;
  /** Re-enable after pause */
  resume: () => void;
  /** Export all bindings as JSON-serializable object */
  exportBindings: () => Array<{ id: string; key: string; modifiers?: ModifierKey[]; label: string; description?: string; category?: string }>;
  /** Import bindings (merges with existing) */
  importBindings: (bindings: Array<{ id: string; key: string; modifiers?: ModifierKey[]; label: string; handler: () => void; description?: string; category?: string }>) => void;
  /** Show keyboard shortcuts help overlay */
  showHelp: () => void;
  /** Hide help overlay */
  hideHelp: () => void;
  /** Show hint for a specific shortcut */
  showHint: (id: string) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function normalizeKey(event: KeyboardEvent): string {
  if (event.key === " ") return "Space";
  if (event.key.length === 1) return event.key.toLowerCase();
  return event.key;
}

function normalizeModifiers(modifiers?: ModifierKey[]): Set<string> {
  return new Set(modifiers?.map((m) => m.toLowerCase()) ?? []);
}

function formatShortcut(binding: ShortcutBinding): string {
  const parts: string[] = [];
  if (binding.modifiers) {
    for (const mod of binding.modifiers) {
      parts.push(mod === "meta" ? "\u2318" : mod === "ctrl" ? "^" : mod === "alt" ? "\u2325" : "\u21E7");
    }
  }
  parts.push(binding.key.toUpperCase());
  return parts.join(" ");
}

function matchesEvent(binding: ShortcutBinding, key: string, mods: Set<string>): boolean {
  if (binding.key.toLowerCase() !== key.toLowerCase()) return false;
  const bindingMods = normalizeModifiers(binding.modifiers);
  for (const m of bindingMods) {
    if (!mods.has(m)) return false;
  }
  for (const m of mods) {
    if (!bindingMods.has(m)) return false;
  }
  return true;
}

// --- Core Factory ---

/**
 * Create a global keyboard shortcut manager.
 *
 * @example
 * ```ts
 * const kb = createKeyboardShortcuts({
 *   target: window,
 *   onFire: (binding) => console.log("Fired:", binding.label),
 * });
 *
 * kb.register({
 *   id: "save",
 *   label: "Save",
 *   key: "s",
 *   modifiers: ["ctrl"],
 *   handler: () => saveDocument(),
 *   category: "File",
 * });
 *
 * // Show all shortcuts:
 * kb.showHelp();
 * ```
 */
export function createKeyboardShortcuts(options: KeyboardShortcutsOptions = {}): KeyboardShortcutsInstance {
  const {
    target = document,
    debug = false,
    defaultScope = "global",
    onFire,
    onConflict,
    showHints = false,
    hintDuration = 2000,
    className,
  } = options;

  const bindings = new Map<string, ShortcutBinding>();
  const groups = new Map<string, ShortcutGroup>();
  let currentScope: ShortcutScope = defaultScope;
  let paused = false;
  let isDestroyed = false;
  let helpOverlay: HTMLElement | null = null;
  let hintOverlay: HTMLElement | null = null;
  let hintTimer: ReturnType<typeof setTimeout> | null = null;

  // Track active input elements to auto-switch scope
  const inputTags = new Set(["INPUT", "TEXTAREA", "SELECT"]);

  function isInInput(): boolean {
    const el = document.activeElement;
    return el != null && inputTags.has(el.tagName) && !el.getAttribute("contenteditable");
  }

  // --- Core handler ---

  function handleKeyDown(e: KeyboardEvent): void {
    if (isDestroyed || paused) return;

    // Ignore typing in inputs when scope is global
    if (currentScope === "global" && isInInput()) return;

    const key = normalizeKey(e);
    const mods = new Set<string>();
    if (e.ctrlKey || e.metaKey) mods.add("ctrl");
    if (e.altKey) mods.add("alt");
    if (e.shiftKey) mods.add("shift");
    if (e.metaKey) mods.add("meta");

    // Find matching binding(s)
    const candidates: ShortcutBinding[] = [];

    for (const [, binding] of bindings) {
      if (binding.enabled === false) continue;

      // Scope check
      const scope = binding.scope ?? defaultScope;
      if (scope !== "global" && scope !== currentScope) continue;

      if (matchesEvent(binding, key, mods)) {
        candidates.push(binding);
      }
    }

    if (candidates.length === 0) return;

    // Sort by priority (highest first)
    candidates.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    const winner = candidates[0];

    // Conflict detection
    if (candidates.length > 1 && onConflict) {
      for (let i = 1; i < candidates.length; i++) {
        onConflict(winner, candidates[i]);
      }
    }

    if (debug) {
      console.log(`[kb] Fired: ${winner.label} (${winner.id})`);
    }

    if (winner.preventDefault !== false) {
      e.preventDefault();
      e.stopPropagation();
    }

    onFire?.(winner, e);
    winner.handler(e);
  }

  // --- Registration ---

  function register(binding: ShortcutBinding): void {
    // Check for conflicts with existing
    for (const [, existing] of bindings) {
      if (existing.id === binding.id) continue;
      if (
        existing.key.toLowerCase() === binding.key.toLowerCase() &&
        JSON.stringify(existing.modifiers?.sort()) === JSON.stringify(binding.modifiers?.sort()) &&
        (existing.scope ?? defaultScope) === (binding.scope ?? defaultScope)
      ) {
        onConflict?.(existing, binding);
      }
    }

    bindings.set(binding.id, { ...binding, enabled: binding.enabled !== false });
  }

  function unregister(id: string): void {
    bindings.delete(id);
  }

  function registerGroup(group: ShortcutGroup): void {
    groups.set(group.name, group);
    for (const binding of group.bindings) {
      register(binding);
    }
  }

  function unregisterGroup(name: string): void {
    const group = groups.get(name);
    if (group) {
      for (const b of group.bindings) {
        unregister(b.id);
      }
      groups.delete(name);
    }
  }

  // --- Query ---

  function has(id: string): boolean { return bindings.has(id); }

  function get(id: string): ShortcutBinding | undefined { return bindings.get(id); }

  function getAll(filter?: { scope?: ShortcutScope; category?: string }): ShortcutBinding[] {
    let result = Array.from(bindings.values());
    if (filter?.scope) result = result.filter((b) => (b.scope ?? defaultScope) === filter.scope);
    if (filter?.category) result = result.filter((b) => b.category === filter.category);
    return result;
  }

  function setEnabled(id: string, enabled: boolean): void {
    const b = bindings.get(id);
    if (b) b.enabled = enabled;
  }

  function setScope(scope: ShortcutScope): void { currentScope = scope; }

  function getScope(): ShortcutScope { return currentScope; }

  function pause(): void { paused = true; }

  function resume(): void { paused = false; }

  // --- Import/Export ---

  function exportBindings() {
    return Array.from(bindings.values()).map((b) => ({
      id: b.id,
      key: b.key,
      modifiers: b.modifiers,
      label: b.label,
      description: b.description,
      category: b.category,
    }));
  }

  function importBindings(imported: Array<{ id: string; key: string; modifiers?: ModifierKey[]; label: string; handler: () => void; description?: string; category?: string }>): void {
    for (const imp of imported) {
      register({
        ...imp,
        handler: imp.handler,
      });
    }
  }

  // --- Help Overlay ---

  function showHelp(): void {
    hideHelp();

    helpOverlay = document.createElement("div");
    helpOverlay.className = `kb-help-overlay ${className ?? ""}`.trim();
    helpOverlay.style.cssText =
      "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);" +
      "display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);";

    const panel = document.createElement("div");
    panel.style.cssText =
      "background:#fff;border-radius:16px;max-width:520px;width:90%;max-height:80vh;" +
      "overflow:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);font-family:-apple-system,sans-serif;";

    // Header
    const hdr = document.createElement("div");
    hdr.style.cssText = "padding:20px 24px 16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;";
    hdr.innerHTML = `<h2 style="margin:0;font-size:18px;font-weight:700;">Keyboard Shortcuts</h2>`;
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "\u2715";
    closeBtn.style.cssText = "border:none;background:none;font-size:18px;cursor:pointer;padding:4px 8px;border-radius:6px;color:#6b7280;";
    closeBtn.addEventListener("click", hideHelp);
    closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#f3f4f6"; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; });
    hdr.appendChild(closeBtn);
    panel.appendChild(hdr);

    // Body grouped by category
    const body = document.createElement("div");
    body.style.padding = "16px 24px 24px;";

    const byCategory = new Map<string, ShortcutBinding[]>();
    for (const b of bindings.values()) {
      if (b.enabled === false) continue;
      const cat = b.category ?? "General";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(b);
    }

    for (const [cat, cats] of byCategory) {
      const catTitle = document.createElement("div");
      catTitle.style.cssText = "font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin-top:16px;margin-bottom:8px;";
      catTitle.textContent = cat === byCategory.keys().next().value ? cat : ""; // only show once per category
      if (cat !== Array.from(byCategory.keys())[0]) {
        const ct = document.createElement("div");
        ct.style.cssText = "font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin-top:16px;margin-bottom:8px;";
        ct.textContent = cat;
        body.appendChild(ct);
      }

      for (const b of cats) {
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;";

        const left = document.createElement("div");
        left.style.cssText = "display:flex;flex-direction:column;gap:1px;";
        const nameLabel = document.createElement("span");
        nameLabel.style.cssText = "font-size:14px;color:#111827;font-weight:500;";
        nameLabel.textContent = b.label;
        left.appendChild(nameLabel);
        if (b.description) {
          const desc = document.createElement("span");
          desc.style.cssText = "font-size:12px;color:#6b7280;";
          desc.textContent = b.description;
          left.appendChild(desc);
        }

        const kbd = document.createElement("kbd");
        kbd.style.cssText =
          "display:inline-flex;align-items:center;gap:2px;padding:3px 8px;" +
          "background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;" +
          "font-family:inherit;font-size:12px;font-weight:600;color:#374151;" +
          "box-shadow:0 1px 2px rgba(0,0,0,0.05);";
        kbd.textContent = formatShortcut(b);

        row.appendChild(left);
        row.appendChild(kbd);
        body.appendChild(row);
      }
    }

    if (byCategory.size === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;color:#9ca3af;padding:32px;font-size:14px;";
      empty.textContent = "No shortcuts registered";
      body.appendChild(empty);
    }

    panel.appendChild(body);
    helpOverlay.appendChild(panel);

    // Close on backdrop click or Escape
    helpOverlay.addEventListener("click", (e) => {
      if (e.target === helpOverlay) hideHelp();
    });

    document.body.appendChild(helpOverlay);
  }

  function hideHelp(): void {
    if (helpOverlay) {
      helpOverlay.remove();
      helpOverlay = null;
    }
  }

  // --- Hint overlay ---

  function showHint(id: string): void {
    const binding = bindings.get(id);
    if (!binding || !showHints) return;

    clearHint();

    hintOverlay = document.createElement("div");
    hintOverlay.className = "kb-hint";
    hintOverlay.style.cssText =
      "position:fixed;bottom:32px;left:50%;transform:translateX(-50%);" +
      "z-index:99998;background:#111827;color:#fff;padding:10px 20px;" +
      "border-radius:10px;font-family:-apple-system,sans-serif;font-size:13px;" +
      "box-shadow:0 10px 30px rgba(0,0,0,0.3);display:flex;align-items:center;gap:12px;" +
      "animation:kbHintIn 0.2s ease-out;";

    const kbd = document.createElement("kbd");
    kbd.style.cssText =
      "display:inline-flex;align-items:center;gap:2px;padding:2px 6px;" +
      "background:rgba(255,255,255,0.15);border-radius:4px;" +
      "font-family:inherit;font-size:12px;font-weight:600;";
    kbd.textContent = formatShortcut(binding);

    hintOverlay.appendChild(kbd);
    const label = document.createElement("span");
    label.textContent = binding.label;
    hintOverlay.appendChild(label);

    document.body.appendChild(hintOverlay);

    hintTimer = setTimeout(clearHint, hintDuration);
  }

  function clearHint(): void {
    if (hintTimer) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
    if (hintOverlay) {
      hintOverlay.remove();
      hintOverlay = null;
    }
  }

  // --- Cleanup ---

  function destroy(): void {
    isDestroyed = true;
    target.removeEventListener("keydown", handleKeyDown as EventListener);
    hideHelp();
    clearHint();
    bindings.clear();
    groups.clear();
  }

  // --- Attach listener ---

  target.addEventListener("keydown", handleKeyDown as EventListener);

  // Auto-register help toggle
  register({
    id: "__help__",
    label: "Show Shortcuts",
    key: "?",
    modifiers: ["ctrl"],
    handler: () => { showHelp(); },
    category: "System",
    preventDefault: true,
  });

  return {
    register, unregister, registerGroup, unregisterGroup,
    has, get, getAll,
    setEnabled, setScope, getScope,
    pause, resume,
    exportBindings, importBindings,
    showHelp, hideHelp, showHint,
    destroy,
  };
}
