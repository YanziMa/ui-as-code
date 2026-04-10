/**
 * Keyboard Key Display (kbd): Styled keyboard shortcut display component
 * with key mapping, combination rendering, OS-style appearance,
 * size variants, and copy-on-click.
 */

// --- Types ---

export type KbdSize = "sm" | "md" | "lg";
export type KbdStyle = "default" | "mac" | "win" | "flat";

export interface KbdOptions {
  /** Container element or selector */
  container?: HTMLElement | string;
  /** The key(s) to display — can be a string like "Ctrl+S" or array of keys */
  keys: string | string[];
  /** Size variant */
  size?: KbdSize;
  /** Visual style */
  style?: KbdStyle;
  /** Show as inline element (return element instead of appending) */
  inline?: boolean;
  /** Copy value to clipboard on click? */
  copyOnClick?: boolean;
  /** Copy tooltip text */
  copyTooltip?: string;
  /** Custom CSS class */
  className?: string;
}

// --- Key Symbol Mapping ---

const KEY_SYMBOLS: Record<string, string> = {
  // Modifiers
  ctrl: "\u2303", control: "\u2303",
  alt: "\u2325", option: "\u2325",
  shift: "\u21E7", cmd: "\u2318", command: "\u2318",
  meta: "\u2318", super: "\u229E",
  enter: "\u21B5", return: "\u21B5",
  tab: "\u21E5", space: "\u2423",
  esc: "\u238B", escape: "\u238B",
  backspace: "\u232B", delete: "\u2421",
  capslock: "\u21EA",
  up: "\u2191", down: "\u2193", left: "\u2190", right: "\u2192",
  home: "\u2196", end: "\u21C3",
  pgup: "\u21DE", pgdn: "\u21DF",
  // Symbols
  plus: "+", minus: "-", equals: "=",
  slash: "/", backslash: "\\",
  bracketleft: "[", bracketright: "]",
  braceleft: "{", braceright: "}",
  comma: ",", period: ".",
  semicolon: ";", colon: ":",
  quote: "'", doublequote: '"',
  grave: "`", tilde: "~",
};

function getKeySymbol(key: string): string {
  const lower = key.toLowerCase().trim();
  if (KEY_SYMBOLS[lower]) return KEY_SYMBOLS[lower];
  // Single character keys
  if (lower.length === 1 && lower.match(/[a-z0-9]/)) return upper.toUpperCase();
  return key;
}

// --- Size Config ---

const SIZE_STYLES: Record<KbdSize, { padding: string; fontSize: number; borderRadius: number; gap: number }> = {
  sm: { padding: "2px 7px", fontSize: 11, borderRadius: 4, gap: 2 },
  md: { padding: "4px 10px", fontSize: 12, borderRadius: 5, gap: 4 },
  lg: { padding: "5px 14px", fontSize: 14, borderRadius: 6, gap: 5 },
};

// --- Main Factory ---

export function createKbd(options: KbdOptions): HTMLElement {
  const opts = {
    size: options.size ?? "md",
    style: options.style ?? "default",
    inline: options.inline ?? false,
    copyOnClick: options.copyOnClick ?? false,
    copyTooltip: options.copyTooltip ?? "Copied!",
    className: options.className ?? "",
    ...options,
  };

  const sz = SIZE_STYLES[opts.size];

  // Parse keys
  const rawKeys: string[] = Array.isArray(opts.keys) ? opts.keys : opts.keys.split(/[\s+]+/);
  const parsedKeys = rawKeys.map((k) => ({
    original: k.trim(),
    symbol: getKeySymbol(k.trim()),
  }));

  // Build element
  const el = document.createElement("kbd");
  el.className = `kbd kbd-${opts.style} kbd-${opts.size} ${opts.className}`;
  el.setAttribute("role", "key";

  // Base styles
  const baseStyles: Record<KbdStyle, string> = {
    default: `background:#f3f4f6;border:1px solid #d1d5db;border-bottom-width:2px;border-color:#c9ccd2 #d1d5db;border-radius:${sz.borderRadius}px;font-family:-apple-system,sans-serif,SFMono-Regular,Menlo,monospace;font-size:${sz.fontSize}px;color:#374151;display:inline-flex;align-items:center;gap:${sz.gap}px;padding:${sz.padding};box-shadow:0 1px 2px rgba(0,0,0,0.05);line-height:1;`,
    mac: `background:linear-gradient(180deg,#fafafa 0%,#e8e8e8 100%);border:1px solid #c0c0c0;border-bottom-width:2px;border-radius:${sz.borderRadius}px;font-family:-apple-system,sans-serif;font-size:${sz.fontSize}px;color:#333;display:inline-flex;align-items:center;gap:${sz.gap}px;padding:${sz.padding};box-shadow:0 1px 2px rgba(0,0,0,0.08),inset 0 1px 0 rgba(255,255,255,0.6);line-height:1;`,
    win: `background:#f0f0f0;border:1px solid #adadad;border-bottom-width:2px;border-radius:${Math.min(sz.borderRadius - 1, 2)}px;font-family:"Segoe UI",system-ui,sans-serif;font-size:${sz.fontSize}px;color:#262626;display:inline-flex;align-items:center;gap:${sz.gap}px;padding:${sz.padding};box-shadow:0 1px 1px rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.5);line-height:1;`,
    flat: `background:#e5e7eb;border:none;border-radius:${sz.borderRadius}px;font-family:-apple-system,sans-serif;font-size:${sz.fontSize}px;color:#4b5563;display:inline-flex;align-items:center;gap:${sz.gap}px;padding:${sz.padding};line-height:1;`,
  };
  el.style.cssText = baseStyles[opts.style];

  // Render individual key caps
  for (let i = 0; i < parsedKeys.length; i++) {
    const { symbol, original } = parsedKeys[i]!;
    const isLast = i === parsedKeys.length - 1;

    const keyEl = document.createElement("span");
    keyEl.className = "kbd-key";
    keyEl.textContent = symbol;

    // Style each key cap
    const isModifier = /^(ctrl|control|alt|option|shift|cmd|command|meta|super)$/i.test(original.toLowerCase());
    keyEl.style.cssText = `
      ${isModifier ? `font-weight:500;text-transform:uppercase;${opts.style === "mac" ? "" : "font-size:10px;"}` : ""}
      ${isLast ? "" : ""}
      ${opts.style === "win" ? "font-family:inherit;" : ""}
    `;

    el.appendChild(keyEl);

    // Add + between non-modifier keys for combos like Ctrl+S
    if (!isLast && !isModifier && i > 0 && !/^(ctrl|control|alt|option|shift|cmd|command|meta|super)$/i.test(parsedKeys[i - 1]!.original.toLowerCase())) {
      const sep = document.createElement("span");
      sep.textContent = opts.style === "mac" ? "" : "+";
      sep.style.cssText = `color:#9ca3af;margin:0 1px;font-size:${Math.max(sz.fontSize - 2, 10)}px;${opts.style === "mac" ? "display:none;" : ""}`;
      el.insertBefore(sep, keyEl);
    }
  }

  // Click to copy
  if (opts.copyOnClick) {
    el.style.cursor = "pointer";
    el.addEventListener("click", async () => {
      const textToCopy = rawKeys.join("+");
      try {
        await navigator.clipboard.writeText(textToCopy);
        const origTitle = el.getAttribute("title") || "";
        el.setAttribute("title", opts.copyTooltip);
        el.style.background = "#dcfce7";
        setTimeout(() => {
          el.setAttribute("title", origTitle);
          el.style.background = "";
        }, 1200);
      } catch {
        // Clipboard API not available — ignore silently
      }
    });
  }

  // If container provided and not inline mode, append
  if (options.container && !opts.inline) {
    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;
    if (container) container.appendChild(el);
  }

  return el;
}
