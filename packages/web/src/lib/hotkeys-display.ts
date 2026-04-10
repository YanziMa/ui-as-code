/**
 * Hotkeys Display: Visual keyboard shortcut rendering with OS-specific
 * key cap styling (Mac vs Windows), animated key sequences,
 * combination display (Ctrl+Shift+K), chord notation,
 * and accessible ARIA markup for keyboard shortcut hints.
 */

// --- Types ---

export interface KeyCombo {
  /** Primary key */
  key: string;
  /** Ctrl required? */
  ctrl?: boolean;
  /** Shift required? */
  shift?: boolean;
  /** Alt required? */
  alt?: boolean;
  /** Meta/Win/Cmd required? */
  meta?: boolean;
}

export type KeyDisplayStyle = "compact" | "spaced" | "minimal" | "inline";

export interface HotkeyDisplayOptions {
  /** The keyboard combination to render */
  combo: KeyCombo | string;
  /** Display style */
  style?: KeyDisplayStyle;
  /** Size variant */
  size?: "xs" | "sm" | "md" | "lg";
  /** OS override ("mac" | "windows" | "linux") — auto-detect by default */
  os?: "mac" | "windows" | "linux";
  /** Show as a chord sequence? (e.g., "k t" for two-step) */
  chord?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Custom key label overrides (e.g., { " ": "Space", "+": "=" }) */
  keyLabels?: Record<string, string>;
  /** Use symbols instead of text for modifiers on Mac? (default: true) */
  useSymbols?: boolean;
}

export interface HotkeyDisplayInstance {
  /** The rendered DOM element */
  element: HTMLElement;
  /** Update the displayed combo */
  update: (combo: KeyCombo | string) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Constants ---

const KEY_LABELS: Record<string, string> = {
  " ": "Space",
  "+": "=",
  "_": "-",
  "{": "[",
  "}": "]",
  "|": "\\",
  ":": ";",
  '"': "'",
  "<": ",",
  ">": ".",
  "?": "/",
  "~": "`",
  "!": "1",
  "@": "2",
  "#": "3",
  "$": "4",
  "%": "5",
  "^": "6",
  "&": "7",
  "*": "8",
  "(" : "9",
  ")": "0",
  ArrowUp: "\u2191",      // ↑
  ArrowDown: "\u2193",    // ↓
  ArrowLeft: "\u2190",    // ←
  ArrowRight: "\u2192",   // →
  Enter: "\u21B5",        // ↵ or "Enter"
  Tab: "\u21E5",          // ⇥ or "Tab"
  Escape: "Esc",
  Backspace: "\u232B",   // ⌫
  Delete: "Del",
  Insert: "Ins",
  Home: "\u2196",         // ↖
  End: "\u2198",           // ↘
  PageUp: "PgUp",
  PageDown: "PgDn",
  CapsLock: "Caps",
  NumLock: "Num",
  ScrollLock: "Scroll",
  PrintScreen: "PrtSc",
  Pause: "Pause",
};

/** Mac-style modifier symbols */
const MAC_SYMBOLS: Record<string, string> = {
  ctrl: "\u2303",   // ⌃
  alt: "\u2325",     // ⌥ Option
  shift: "\u21E7",   // ⇧ Shift
  meta: "\u2318",    // ⌘ Cmd
};

const WINDOWS_LABELS: Record<string, string> = {
  ctrl: "Ctrl",
  alt: "Alt",
  shift: "Shift",
  meta: "Win",
};

const SIZE_STYLES: Record<string, { padding: string; fontSize: string; borderRadius: string; gap: string }> = {
  xs:  { padding: "1px 6px",  fontSize: "10px", borderRadius: "4px", gap: "2px" },
  sm:  { padding: "2px 7px",  fontSize: "11px", borderRadius: "5px", gap: "3px" },
  md:  { padding: "3px 9px",  fontSize: "12px", borderRadius: "6px", gap: "4px" },
  lg:  { padding: "4px 12px", fontSize: "14px", borderRadius: "8px", gap: "5px" },
};

// --- Helpers ---

function detectOS(): "mac" | "windows" | "linux" {
  if (typeof navigator === "undefined") return "windows";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "mac";
  if (ua.includes("win")) return "windows";
  return "linux";
}

function parseCombo(combo: KeyCombo | string): KeyCombo {
  if (typeof combo === "string") {
    // Parse "Ctrl+Shift+K" format
    const parts = combo.split("+").map((p) => p.trim());
    const result: KeyCombo = { key: "" };

    const modKeys = ["ctrl", "control", "alt", "shift", "meta", "cmd", "super", "mod"];
    const keyParts: string[] = [];

    for (const part of parts) {
      const lower = part.toLowerCase();
      if (modKeys.includes(lower)) {
        if (lower === "ctrl" || lower === "control" || lower === "mod") result.ctrl = true;
        else if (lower === "alt") result.alt = true;
        else if (lower === "shift") result.shift = true;
        else if (lower === "meta" || lower === "cmd" || lower === "super") result.meta = true;
      } else {
        keyParts.push(part);
      }
    }

    result.key = keyParts.join("+");
    return result;
  }

  return combo;
}

function resolveKeyLabel(key: string, customLabels?: Record<string, string>): string {
  // Check custom labels first
  if (customLabels?.[key]) return customLabels[key]!;

  // Check built-in labels
  if (KEY_LABELS[key]) return KEY_LABELS[key]!;

  // Single character — capitalize
  if (key.length === 1) return key.toUpperCase();

  // Multi-character — use as-is but capitalize first letter
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// --- Main Class ---

export class HotkeyDisplayRenderer {
  create(options: HotkeyDisplayOptions): HotkeyDisplayInstance {
    let destroyed = false;

    const opts = {
      style: options.style ?? "compact",
      size: options.size ?? "sm",
      os: options.os ?? detectOS(),
      useSymbols: options.useSymbols ?? true,
      ...options,
    };

    const isMac = opts.os === "mac";
    const sizeStyle = SIZE_STYLES[opts.size]!;
    const symbols = isMac && opts.useSymbols ? MAC_SYMBOLS : WINDOWS_LABELS;

    // Container element
    const el = document.createElement("kbd");
    el.className = `hk-hotkey hk-${opts.style} hk-${opts.size} ${options.className ?? ""}`;
    el.setAttribute("aria-label", this.buildAriaLabel(parseCombo(options.combo)));

    function buildAriaLabel(combo: KeyCombo): string {
      const parts: string[] = [];
      if (combo.ctrl) parts.push(isMac ? "Control" : "Control");
      if (combo.alt) parts.push(isMac ? "Option" : "Alt");
      if (combo.shift) parts.push("Shift");
      if (combo.meta) parts.push(isMac ? "Command" : "Windows");
      parts.push(resolveKeyLabel(combo.key, options.keyLabels));
      return parts.join(" ");
    }

    function render(combo: KeyCombo | string): void {
      const parsed = parseCombo(combo);

      // Build key sequence
      const keys: string[] = [];
      if (parsed.ctrl) keys.push(symbols.ctrl);
      if (parsed.alt) keys.push(symbols.alt);
      if (parsed.shift) keys.push(symbols.shift);
      if (parsed.meta) keys.push(symbols.meta);
      keys.push(resolveKeyLabel(parsed.key, options.keyLabels));

      el.innerHTML = "";

      switch (opts.style) {
        case "compact":
          // All in one line with + separators
          el.style.cssText = `
            display:inline-flex;align-items:center;${isMac ? "" : "gap:" + sizeStyle.gap};
            font-family:${isMac ? "-apple-system, BlinkMacSystemFont, sans-serif" : "'Segoe UI', system-ui, sans-serif"};
            font-size:${sizeStyle.fontSize};font-weight:500;color:#374151;line-height:1.4;
            ${isMac ? `color:#fff;` : ""}
            user-select:none;vertical-align:middle;
          `;
          if (!isMac) {
            for (let i = 0; i < keys.length; i++) {
              const keyEl = document.createElement("span");
              keyEl.className = "hk-key";
              keyEl.textContent = keys[i]!;
              keyEl.style.cssText = `
                display:inline-block;background:#f3f4f6;border:1px solid #d1d5db;
                border-bottom-width:2px;border-radius:${sizeStyle.borderRadius};
                padding:${sizeStyle.padding};box-shadow:0 1px 0 rgba(0,0,0,0.08);
                min-width:18px;text-align:center;box-sizing:border-box;
              `;
              el.appendChild(keyEl);
              if (i < keys.length - 1) {
                const plus = document.createElement("span");
                plus.textContent = "+";
                plus.style.cssText = `margin:0 ${sizeStyle.gap};color:#9ca3af;font-weight:400;`;
                el.appendChild(plus);
              }
            }
          } else {
            // Mac style: no individual caps, just text
            el.textContent = keys.join("");
            el.style.fontWeight = "600";
            el.style.letterSpacing = "0.05em";
          }
          break;

        case "spaced":
          // Each key gets its own styled cap
          el.style.cssText = `
            display:inline-flex;align-items:center;gap:${sizeStyle.gap};
            font-family:-apple-system, BlinkMacSystemFont, sans-serif;
            font-size:${sizeStyle.fontSize};font-weight:500;color:#374151;
            user-select:none;vertical-align:middle;
          `;
          for (const k of keys) {
            const keyEl = document.createElement("span");
            keyEl.className = "hk-key";
            keyEl.textContent = k;
            keyEl.style.cssText = `
              display:inline-flex;align-items:center;justify-content:center;
              background:linear-gradient(180deg, #fafafa 0%, #f0f0f0 100%);
              border:1px solid #d1d5db;border-bottom-color:#b0b5ba;
              border-radius:${sizeStyle.borderRadius};padding:${sizeStyle.padding};
              box-shadow:0 1px 2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7);
              min-width:22px;text-align:center;box-sizing:border-box;
              font-weight:600;
            `;
            el.appendChild(keyEl);
          }
          break;

        case "minimal":
          // Plain text, minimal styling
          el.style.cssText = `
            display:inline;font-family:monospace;font-size:${sizeStyle.fontSize};
            color:#6b7280;font-weight:400;padding:1px 4px;
            background:#f9fafb;border-radius:3px;user-select:none;
          `;
          el.textContent = keys.join(isMac ? "" : "+");
          break;

        case "inline":
          // Inline within text flow, small caps style
          el.style.cssText = `
            display:inline;font-variant-numeric:tabular-nums;
            font-family:${isMac ? "-apple-system, sans-serif" : "'Segoe UI', sans-serif"};
            font-size:${sizeStyle.fontSize};color:#6b7280;
            letter-spacing:0.02em;user-select:none;
          `;
          el.innerHTML = `<span style="opacity:0.6">${keys.slice(0, -1).join("")}</span><span style="font-weight:600">${keys[keys.length - 1]}</span>`;
          break;
      }

      // Chord indicator
      if (options.chord && keys.length > 1) {
        const chordSep = document.createElement("span");
        chordSep.textContent = " ";
        chordSep.className = "hk-chord-sep";
        chordSep.style.cssText = `margin:0 2px;color:#d1d5db;`;
        // Insert before last key
        const children = el.children;
        if (children.length > 1) {
          el.insertBefore(chordSep, children[children.length - 1]);
        }
      }
    }

    // Initial render
    render(options.combo);

    const instance: HotkeyDisplayInstance = {
      element: el,

      update(newCombo): void {
        if (destroyed) return;
        render(newCombo);
        el.setAttribute("aria-label", buildAriaLabel(parseCombo(newCombo)));
      },

      destroy(): void {
        destroyed = true;
        el.remove();
      },
    };

    return instance;
  }
}

// --- Convenience functions ---

/**
 * Render a hotkey display element and attach it to a parent.
 */
export function renderHotkey(
  parent: HTMLElement,
  combo: KeyCombo | string,
  options?: Omit<HotkeyDisplayOptions, "combo">,
): HotkeyDisplayInstance {
  const renderer = new HotkeyDisplayRenderer();
  const instance = renderer.create({ ...options, combo });
  parent.appendChild(instance.element);
  return instance;
}

/**
 * Quick render: returns an HTML string for inline hotkey display.
 * Useful for template literals or innerHTML.
 */
export function hotkeyHtml(
  combo: KeyCombo | string,
  options?: { style?: KeyDisplayStyle; size?: "xs" | "sm" | "md" | "lg"; className?: string },
): string {
  const parsed = parseCombo(combo);
  const os = detectOS();
  const isMac = os === "mac";

  const keys: string[] = [];
  if (parsed.ctrl) keys.push(isMac ? MAC_SYMBOLS.ctrl : "Ctrl");
  if (parsed.alt) keys.push(isMac ? MAC_SYMBOLS.alt : "Alt");
  if (parsed.shift) keys.push(isMac ? MAC_SYMBOLS.shift : "Shift");
  if (parsed.meta) keys.push(isMac ? MAC_SYMBOLS.meta : "Win");
  keys.push(resolveKeyLabel(parsed.key));

  const style = options?.style ?? "compact";
  const cls = options?.className ?? "";
  const sep = isMac ? "" : "+";

  if (style === "minimal" || style === "inline") {
    return `<kbd class="hk-hotkey hk-${style} ${cls}" style="font-family:monospace;font-size:11px;color:#6b7280">${keys.join(sep)}</kbd>`;
  }

  // For compact/spaced, generate individual key spans
  const keySpans = keys.map((k) =>
    `<span class="hk-key" style="display:inline-block;background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;padding:1px 6px;font-size:11px;margin:0 2px">${k}</span>`
  ).join("");

  return `<kbd class="hk-hotkey hk-${style} ${cls}" role="img" aria-label="${keys.join(" ")}">${keySpans}</kbd>`;
}
