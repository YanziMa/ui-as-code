/**
 * Form Label: Enhanced form label with required indicator, helper text,
 * error state, description tooltip, character counter, and accessibility.
 */

// --- Types ---

export type LabelSize = "sm" | "md" | "lg";
export type LabelPosition = "top" | "side" | "floating";

export interface FormLabelOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Label text */
  text: string;
  /** For attribute (links to input) */
  htmlFor?: string;
  /** Required field indicator */
  required?: boolean;
  /** Required marker text (default: "*") */
  requiredText?: string;
  /** Helper/description text */
  help?: string;
  /** Error message */
  error?: string;
  /** Warning message */
  warning?: string;
  /** Description/tooltip text */
  description?: string;
  /** Size variant */
  size?: LabelSize;
  /** Position relative to input */
  position?: LabelPosition;
  /** Show character count (for associated textarea/input) */
  charCount?: { current: number; max: number };
  /** Custom CSS class */
  className?: string;
  /** Click handler (e.g., for info icon) */
  onClick?: () => void;
}

export interface FormLabelInstance {
  element: HTMLElement;
  setText: (text: string) => void;
  setHelp: (text: string | undefined) => void;
  setError: (error: string | undefined) => void;
  setWarning: (warning: string | undefined) => void;
  setCharCount: (count: { current: number; max: number } | undefined) => void;
  setRequired: (required: boolean) => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<LabelSize, { fontSize: number; fontWeight: number; gap: number }> = {
  sm:  { fontSize: 12, fontWeight: 500, gap: 3 },
  md:  { fontSize: 13, fontWeight: 500, gap: 4 },
  lg:  { fontSize: 14, fontWeight: 600, gap: 5 },
};

// --- Main Factory ---

export function createFormLabel(options: FormLabelOptions): FormLabelInstance {
  const opts = {
    size: options.size ?? "md",
    position: options.position ?? "top",
    required: options.required ?? false,
    requiredText: options.requiredText ?? "*",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("FormLabel: container not found");

  const sz = SIZE_STYLES[opts.size];

  // Root
  const root = document.createElement("div");
  root.className = `form-label ${opts.className}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;display:flex;flex-direction:column;gap:${sz.gap}px;
  `;
  if (opts.htmlFor) root.setAttribute("for", opts.htmlFor);

  // Label row
  const labelRow = document.createElement("div");
  labelRow.style.cssText = "display:flex;align-items:center;gap:4px;";

  // Text
  const labelText = document.createElement("span");
  labelText.className = "fl-text";
  labelText.textContent = opts.text;
  labelText.style.cssText = `
    font-size:${sz.fontSize}px;font-weight:${sz.fontWeight};color:#374151;line-height:1.2;
  `;
  labelRow.appendChild(labelText);

  // Required indicator
  if (opts.required) {
    const req = document.createElement("span");
    req.className = "fl-required";
    req.textContent = opts.requiredText;
    req.style.cssText = "color:#dc2626;margin-left:1px;";
    labelRow.appendChild(req);
  }

  // Info icon (if description)
  let infoIcon: HTMLSpanElement | null = null;
  if (opts.description) {
    infoIcon = document.createElement("span");
    infoIcon.innerHTML = "&#8505;"; // ℹ️
    infoIcon.style.cssText = "color:#6b7280;cursor:pointer;font-size:${sz.fontSize + 1}px;flex-shrink:0;";
    infoIcon.title = opts.description;
    infoIcon.addEventListener("click", () => opts.onClick?.());
    labelRow.appendChild(infoIcon);
  }

  root.appendChild(labelRow);

  // Helper text
  let helpEl: HTMLDivElement | null = null;
  if (opts.help) {
    helpEl = document.createElement("div");
    helpEl.className = "fl-help";
    helpEl.textContent = opts.help;
    helpEl.style.cssText = `font-size:${sz.fontSize - 1}px;color:#6b7280;`;
    root.appendChild(helpEl);
  }

  // Error text
  let errorEl: HTMLDivElement | null = null;
  if (opts.error) {
    errorEl = document.createElement("div");
    errorEl.className = "fl-error";
    errorEl.textContent = opts.error;
    errorEl.style.cssText = `font-size:${sz.fontSize - 1}px;color:#dc2626;display:flex;align-items:center;gap:3px;`;
    root.appendChild(errorEl);
  }

  // Warning text
  let warnEl: HTMLDivElement | null = null;
  if (opts.warning) {
    warnEl = document.createElement("div");
    warnEl.className = "fl-warning";
    warnEl.textContent = opts.warning;
    warnEl.style.cssText = `font-size:${sz.fontSize - 1}px;color:#d97706;display:flex;align-items:center;gap:3px;`;
    root.appendChild(warnEl);
  }

  // Character count
  let countEl: HTMLSpanElement | null = null;
  if (opts.charCount) {
    countEl = document.createElement("span");
    updateCountDisplay();
    countEl.style.cssText = "font-size:11px;text-align:right;color:#9ca3af;align-self:flex-end;";
    root.appendChild(countEl);
  }

  // --- Internal ---

  function updateCountDisplay(): void {
    if (!countEl || !opts.charCount) return;
    const { current, max } = opts.charCount;
    const pct = max > 0 ? (current / max) * 100 : 0;
    const nearLimit = max > 0 && pct > 85;
    const overLimit = max > 0 && current > max;

    countEl.textContent = `${current}/${max}`;
    countEl.style.color = overLimit ? "#dc2626" : nearLimit ? "#d97706" : "#9ca3af";
  }

  // Instance
  const instance: FormLabelInstance = {
    element: root,

    setText(text: string) {
      opts.text = text;
      labelText.textContent = text;
    },

    setHelp(text: string | undefined) {
      opts.help = text;
      if (helpEl) {
        if (text) {
          helpEl.textContent = text;
          helpEl.style.display = "";
        } else {
          helpEl.style.display = "none";
        }
      } else if (text) {
        helpEl = document.createElement("div");
        helpEl.className = "fl-help";
        helpEl.textContent = text;
        helpEl.style.cssText = `font-size:${sz.fontSize - 1}px;color:#6b7280;`;
        root.appendChild(helpEl);
      }
    },

    setError(error: string | undefined) {
      opts.error = error;
      if (errorEl) {
        if (error) {
          errorEl.textContent = error;
          errorEl.style.display = "";
        } else {
          errorEl.style.display = "none";
        }
      } else if (error) {
        errorEl = document.createElement("div");
        errorEl.className = "fl-error";
        errorEl.textContent = error;
        errorEl.style.cssText = `font-size:${sz.fontSize - 1}px;color:#dc2626;display:flex;align-items:center;gap:3px;`;
        root.appendChild(errorEl);
      }
    },

    setWarning(warning: string | undefined) {
      opts.warning = warning;
      if (warnEl) {
        if (warning) {
          warnEl.textContent = warning;
          warnEl.style.display = "";
        } else {
          warnEl.style.display = "none";
        }
      } else if (warning) {
        warnEl = document.createElement("div");
        warnEl.className = "fl-warning";
        warnEl.textContent = warning;
        warnEl.style.cssText = `font-size:${sz.fontSize - 1}px;color:#d97706;display:flex;align-items:center;gap:3px;`;
        root.appendChild(warnEl);
      }
    },

    setCharCount(count: { current: number; max: number } | undefined) {
      opts.charCount = count;
      if (countEl) {
        if (count) {
          updateCountDisplay();
          countEl.style.display = "";
        } else {
          countEl.style.display = "none";
        }
      }
    },

    setRequired(required: boolean) {
      opts.required = required;
      if (req) {
        req.style.display = required ? "" : "none";
      }
    },

    destroy() { root.remove(); },
  };

  return instance;
}
