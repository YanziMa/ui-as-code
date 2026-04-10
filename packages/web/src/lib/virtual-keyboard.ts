/**
 * Virtual Keyboard: On-screen keyboard for touch devices with multiple layouts
 * (QWERTY, numeric, symbols), key feedback animation, input integration,
 * theme support, and accessibility.
 */

// --- Types ---

export type KeyboardLayout = "qwerty" | "numeric" | "symbols" | "email" | "url";

export interface VirtualKeyboardOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Target input element (auto-focuses on open) */
  target?: HTMLInputElement | HTMLTextAreaElement;
  /** Initial layout */
  layout?: KeyboardLayout;
  /** Show layout switcher? */
  showLayoutSwitcher?: boolean;
  /** Key size in px */
  keySize?: number;
  /** Key gap in px */
  keyGap?: number;
  /** Key border radius */
  keyRadius?: number;
  /** Theme: light, dark, or auto */
  theme?: "light" | "dark" | "auto";
  /** Custom key labels override */
  customKeys?: Record<string, string>;
  /** Callback on key press (return false to prevent default) */
  onKeyPress?: (key: string) => boolean | void;
  /** Callback on Enter key */
  onEnter?: () => void;
  /** Callback on Backspace */
  onBackspace?: () => void;
  /** Callback when keyboard opens/visible */
  onOpen?: () => void;
  /** Callback when keyboard closes/hides */
  onClose?: () => void;
  /** Show space bar as full-width? */
  fullWidthSpace?: boolean;
  /** Auto-show on input focus? */
  attachToInput?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface VirtualKeyboardInstance {
  element: HTMLElement;
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  setLayout: (layout: KeyboardLayout) => void;
  setTarget: (input: HTMLInputElement | HTMLTextAreaElement) => void;
  destroy: () => void;
}

// --- Layout Definitions ---

const LAYOUTS: Record<KeyboardLayout, string[][]> = {
  qwerty: [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["\u21E7", "z", "x", "c", "v", "b", "n", "m", "\u232B"], // shift + backspace
    [""], // space row placeholder
  ],
  numeric: [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["+", "-", "*", "/", "=", "%"],
    [".", ",", "@", "#", "$", "&", "^", "!"],
    ["\u2190", "", "", "", "", "", "", "", "\u232B"], // left arrow + backspace
    [""],
  ],
  symbols: [
    ["[", "]", "{", "}", "<", ">", "|", "\\", "/"],
    ["~", "`", "_", "+", "-", "*", "?", "!"],
    [":", ";", "'", "\"", ".", ",", "@"],
    ["ABC", "", "", "", "", "", "", "", "\u232B"],
    [""],
  ],
  email: [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["@", ".", "-", "_", "0", "1", "2", "3", "4"],
    ["\u21E7", "", "", "", "", "", "", "", "\u232B"],
    [""],
  ],
  url: [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["/", ".", "-", "_", ":", "/", "?", "#", "="],
    ["com", ".org", ".net", ".io", ".dev", ".app", "", "", ""],
    ["\u21E7", "", "", "", "", "", "", "", "\u232B"],
    [""],
  ],
};

const LAYOUT_LABELS: Record<KeyboardLayout, string> = {
  qwerty: "ABC",
  numeric: "123",
  symbols: "#+=",
  email: "@.",
  url: "URL",
};

// --- Main Class ---

export class VirtualKeyboardManager {
  create(options: VirtualKeyboardOptions): VirtualKeyboardInstance {
    const opts = {
      layout: options.layout ?? "qwerty",
      showLayoutSwitcher: options.showLayoutSwitcher ?? true,
      keySize: options.keySize ?? 40,
      keyGap: options.keyGap ?? 4,
      keyRadius: options.keyRadius ?? 8,
      theme: options.theme ?? "auto",
      fullWidthSpace: options.fullWidthSpace ?? true,
      attachToInput: options.attachToInput ?? false,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("VirtualKeyboard: container not found");

    container.className = `virtual-keyboard vk-theme-${opts.theme} ${opts.className ?? ""}`;
    let currentLayout = opts.layout;
    let isOpen = false;
    let destroyed = false;

    const isDark = opts.theme === "dark" || (opts.theme === "auto" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);

    function render(): void {
      container.innerHTML = "";

      const bg = isDark ? "#1f2937" : "#fff";
      const borderColor = isDark ? "#374151" : "#e5e7eb";
      const textColor = isDark ? "#f3f4f6" : "#111827";
      const keyBg = isDark ? "#374151" : "#f3f4f6";
      const keyActiveBg = isDark ? "#4b5563" : "#e5e7eb";
      const specialKeyBg = isDark ? "#4b5563" : "#e5e7eb";

      container.style.cssText = `
        background:${bg};border-top:1px solid ${borderColor};
        padding:${opts.keyGap}px;user-select:none;
        display:flex;flex-direction:column;gap:${opts.keyGap}px;
        ${isOpen ? "" : "display:none;"}
        touch-action:manipulation;
      `;

      const rows = LAYOUTS[currentLayout]!;
      let shiftActive = false;

      for (let ri = 0; ri < rows.length; ri++) {
        const row = rows[ri];

        // Last row = space bar row
        if (ri === rows.length - 1) {
          renderSpaceRow(container, isDark);
          continue;
        }

        const rowEl = document.createElement("div");
        rowEl.style.cssText = `display:flex;gap:${opts.keyGap}px;justify-content:center;`;

        for (const key of row) {
          if (!key) {
            // Spacer for gap (e.g., around shift/backspace)
            const spacer = document.createElement("div");
            spacer.style.cssText = `width:${opts.keySize * 0.4}px;`;
            rowEl.appendChild(spacer);
            continue;
          }

          const isSpecial = key === "\u21E7" || key === "\u232B" || key === "\u2190" || key === "ABC" || key === "123" || key === "#+=" || key === "@." || key === "URL";
          const btn = document.createElement("button");
          btn.type = "button";
          btn.dataset.key = key;

          // Resolve label from custom keys map
          const label = opts.customKeys?.[key] ?? key;

          btn.style.cssText = `
            display:flex;align-items:center;justify-content:center;
            width:${getKeyWidth(key)}px;height:${opts.keySize}px;border-radius:${opts.keyRadius}px;
            font-size:${opts.keySize * 0.38}px;font-weight:500;color:${textColor};
            background:${isSpecial ? specialKeyBg : keyBg};border:none;
            cursor:pointer;transition:background 0.1s,color 0.1s;
            flex-shrink:0;position:relative;
            font-family:-apple-system,sans-serif;
          `;

          // Special key labels
          if (key === "\u21E7") btn.innerHTML = "&#8679;"; // shift symbol
          else if (key === "\u232B") btn.innerHTML = "&#9003;"; // backspace
          else if (key === "\u2190") btn.innerHTML = "&larr;";
          else if (key === "ABC") { btn.textContent = "ABC"; btn.style.fontSize = `${opts.keySize * 0.28}px`; }
          else if (key === "123") { btn.textContent = "123"; btn.style.fontSize = `${opts.keySize * 0.28}px`; }
          else if (key === "#+=") { btn.textContent = "#+="; btn.style.fontSize = `${opts.keySize * 0.26}px`; }
          else if (key === "@.") { btn.textContent = "@."; btn.style.fontSize = `${opts.keySize * 0.32}px`; }
          else if (key === "URL") { btn.textContent = ".com"; btn.style.fontSize = `${opts.keySize * 0.28}px`; }
          else btn.textContent = label.toUpperCase();

          // Click handler
          btn.addEventListener("click", () => handleKeyPress(key));

          // Touch feedback
          btn.addEventListener("touchstart", () => {
            btn.style.background = isDark ? "#6b7280" : "#d1d5db";
            btn.style.transform = "scale(0.95)";
          }, { passive: true });
          btn.addEventListener("touchend", () => {
            btn.style.background = isSpecial ? specialKeyBg : keyBg;
            btn.style.transform = "";
          }, { passive: true });

          rowEl.appendChild(btn);
        }

        container.appendChild(rowEl);
      }

      // Layout switcher
      if (opts.showLayoutSwitcher && currentLayout !== "email" && currentLayout !== "url") {
        const switcherRow = document.createElement("div");
        switcherRow.style.cssText = `display:flex;gap:${opts.keyGap}px;justify-content:center;padding-top:${opts.keyGap}px;`;

        const layouts: KeyboardLayout[] = ["qwerty", "numeric", "symbols"];
        for (const l of layouts) {
          const swBtn = document.createElement("button");
          swBtn.type = "button";
          swBtn.textContent = LAYOUT_LABELS[l];
          swBtn.dataset.layout = l;
          swBtn.style.cssText = `
            padding:4px 14px;border-radius:${opts.keyRadius}px;font-size:12px;font-weight:500;
            background:${currentLayout === l ? (isDark ? "#4338ca" : "#eef2ff") : (isDark ? "#374151" : "#f3f4f6")};
            color:${currentLayout === l ? (isDark ? "#c7d2fe" : "#4338ca") : textColor};
            border:none;cursor:pointer;transition:all 0.15s;
          `;
          swBtn.addEventListener("click", () => { currentLayout = l; render(); });
          switcherRow.appendChild(swBtn);
        }

        container.appendChild(switcherRow);
      }

      // Dismiss button (for non-attached mode)
      if (!opts.attachToInput) {
        const dismissRow = document.createElement("div");
        dismissRow.style.cssText = `display:flex;justify-content:center;padding-top:${opts.keyGap}px;`;
        const dismissBtn = document.createElement("button");
        dismissBtn.type = "button";
        dismissBtn.innerHTML = "&#9650;&#xFE0F; Keyboard"; // ⬇️
        dismissBtn.style.cssText = `
          padding:6px 20px;border-radius:${opts.keyRadius}px;font-size:12px;
          background:${specialKeyBg};color:${textColor};border:none;cursor:pointer;
        `;
        dismissBtn.addEventListener("click", () => instance.close());
        dismissRow.appendChild(dismissBtn);
        container.appendChild(dismissRow);
      }
    }

    function getKeyWidth(key: string): number {
      if (key === "\u232B") return opts.keySize * 1.4; // Backspace wider
      if (key === "\u21E7") return opts.keySize * 1.3;   // Shift wider
      if (key === "\u2190") return opts.keySize * 1.2;     // Arrow
      return opts.keySize;
    }

    function renderSpaceRow(parent: HTMLElement, dark: boolean): void {
      const row = document.createElement("div");
      row.style.cssText = `display:flex;gap:${opts.keyGap}px;justify-content:center;align-items:center;`;

      // Left side: optional keys based on layout
      if (currentLayout === "numeric") {
        addKey(row, ".", dark); // decimal point
        addKey(row, ",", dark); // comma
      } else if (currentLayout === "symbols") {
        addKey(row, ",", dark);
      } else if (currentLayout === "url") {
        addKey(row, "/", dark);
        addKey(row, ".", dark);
      } else {
        addKey(row, ",", dark);
      }

      // Space bar
      const spaceWidth = opts.fullWidthSpace
        ? opts.keySize * 6 + opts.keyGap * 5
        : opts.keySize * 4;
      const spaceBtn = document.createElement("button");
      spaceBtn.type = "button";
      spaceBtn.dataset.key = " ";
      spaceBtn.style.cssText = `
        display:flex;align-items:center;justify-content:center;
        height:${opts.keySize}px;border-radius:${opts.keyRadius}px;
        font-size:${opts.keySize * 0.22}px;font-weight:400;color:${dark ? "#9ca3af" : "#6b7280"};
        background:${dark ? "#374151" : "#f3f4f6"};border:none;
        cursor:pointer;width:${spaceWidth}px;flex-shrink:0;
        transition:background 0.1s;
      `;
      spaceBtn.textContent = "SPACE";
      spaceBtn.addEventListener("click", () => handleKeyPress(" "));
      spaceBtn.addEventListener("touchstart", () => { spaceBtn.style.background = dark ? "#4b5563" : "#e5e7eb"; }, { passive: true });
      spaceBtn.addEventListener("touchend", () => { spaceBtn.style.background = dark ? "#374151" : "#f3f4f6"; }, { passive: true });
      row.appendChild(spaceBtn);

      // Right side
      if (currentLayout === "numeric" || currentLayout === "symbols") {
        addKey(row, "\u2190", dark); // left arrow / go
      } else {
        addKey(row, "\u232B", dark); // backspace
      }

      parent.appendChild(row);
    }

    function addKey(parent: HTMLElement, key: string, dark: boolean): void {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.key = key;
      const label = key === "\u232B" ? "&#9003;" : key === "\u2190" ? "&larr;" : key;
      btn.innerHTML = label;
      btn.style.cssText = `
        display:flex;align-items:center;justify-content:center;
        width:${opts.keySize}px;height:${opts.keySize}px;border-radius:${opts.keyRadius}px;
        font-size:${opts.keySize * 0.35}px;color:${dark ? "#d1d5db" : "#374151"};
        background:${dark ? "#374151" : "#f3f4f6"};border:none;
        cursor:pointer;flex-shrink:0;transition:background 0.1s;
      `;
      btn.addEventListener("click", () => handleKeyPress(key));
      parent.appendChild(btn);
    }

    function handleKeyPress(key: string): void {
      // Handle special keys
      if (key === "\u232B") {
        opts.onBackspace?.();
        if (opts.target) {
          opts.target.focus();
          document.execCommand("delete");
        }
        return;
      }

      if (key === "\u2190") {
        // Left arrow / go action
        opts.onKeyPress?.("\u2190");
        return;
      }

      // Layout switching keys
      if (key === "ABC") { instance.setLayout("qwerty"); return; }
      if (key === "123") { instance.setLayout("numeric"); return; }
      if (key === "#+=") { instance.setLayout("symbols"); return; }
      if (key === "@.") { instance.setLayout("email"); return; }
      if (key === "URL" || key === ".com") { instance.setLayout("url"); return; }

      // Shift toggle (simplified - just uppercase next char)
      if (key === "\u21E7") {
        // In a real implementation this would toggle shift state
        return;
      }

      // Normal key
      const prevent = opts.onKeyPress?.(key);
      if (prevent === false) return;

      if (opts.target) {
        opts.target.focus();
        const start = opts.target.selectionStart ?? opts.target.value.length;
        const end = opts.target.selectionEnd ?? opts.target.value.length;
        const val = opts.target.value;
        opts.target.value = val.slice(0, start) + key + val.slice(end);
        opts.target.setSelectionRange(start + 1, start + 1);
        opts.target.dispatchEvent(new Event("input", { bubbles: true }));
      }

      if (key === " ") opts.onEnter?.(); // Space often acts as submit
    }

    // Attach to input focus/blur if configured
    if (opts.attachToInput && opts.target) {
      opts.target.addEventListener("focus", () => instance.open());
      // Note: blur handling needs care — don't auto-close on every blur
    }

    // Initial render
    render();

    const instance: VirtualKeyboardInstance = {
      element: container,

      open() {
        isOpen = true;
        render();
        opts.onOpen?.();
      },

      close() {
        isOpen = false;
        container.style.display = "none";
        opts.onClose?.();
      },

      toggle() {
        if (isOpen) instance.close();
        else instance.open();
      },

      isOpen() { return isOpen; },

      setLayout(layout: KeyboardLayout) {
        currentLayout = layout;
        if (isOpen) render();
      },

      setTarget(input: HTMLInputElement | HTMLTextAreaElement) {
        // Detach from old input
        if (opts.target && opts.attachToInput) {
          // Would need to store old listener ref to remove
        }
        opts.target = input;
        if (opts.attachToInput && input) {
          input.addEventListener("focus", () => instance.open());
        }
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a virtual keyboard */
export function createVirtualKeyboard(options: VirtualKeyboardOptions): VirtualKeyboardInstance {
  return new VirtualKeyboardManager().create(options);
}
