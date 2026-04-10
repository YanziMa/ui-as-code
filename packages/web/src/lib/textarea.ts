/**
 * Enhanced Textarea: Auto-resizing textarea with character counter,
 * validation states, label, helper text, max rows, min rows, and ARIA support.
 */

// --- Types ---

export type TextareaSize = "sm" | "md" | "lg";
export type TextareaState = "default" | "error" | "success" | "warning";

export interface TextareaOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Placeholder text */
  placeholder?: string;
  /** Default value */
  value?: string;
  /** Size variant */
  size?: TextareaSize;
  /** Validation state */
  state?: TextareaState;
  /** Error message */
  error?: string;
  /** Helper text below input */
  helperText?: string;
  /** Label text */
  label?: string;
  /** Max length for character counter */
  maxLength?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Auto-resize height (default: true) */
  autoResize?: boolean;
  /** Minimum number of visible rows (default: 2) */
  minRows?: number;
  /** Maximum number of visible rows (0 = unlimited) */
  maxRows?: number;
  /** Full width */
  fullWidth?: boolean;
  /** Callback on change */
  onChange?: (value: string) => void;
  /** Callback on focus */
  onFocus?: () => void;
  /** Callback on blur */
  onBlur?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface TextareaInstance {
  element: HTMLElement;
  textareaEl: HTMLTextAreaElement;
  getValue: () => string;
  setValue: (value: string) => void;
  getState: () => TextareaState;
  setState: (state: TextareaState, message?: string) => void;
  focus: () => void;
  blur: () => void;
  clear: () => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<TextareaSize, { padding: string; fontSize: number; borderRadius: number }> = {
  sm: { padding: "6px 10px", fontSize: 13, borderRadius: 6 },
  md: { padding: "8px 12px", fontSize: 14, borderRadius: 8 },
  lg: { padding: "10px 14px", fontSize: 15, borderRadius: 8 },
};

const STATE_COLORS: Record<TextareaState, { border: string; bg: string; focusRing: string }> = {
  default:  { border: "#d1d5db", bg: "#fff",   focusRing: "#6366f1" },
  success:  { border: "#86efac", bg: "#f0fdf4", focusRing: "#16a34a" },
  warning:  { border: "#fcd34d", bg: "#fffbeb", focusRing: "#d97706" },
  error:    { border: "#fca5a5", bg: "#fef2f2", focusRing: "#dc2626" },
};

// --- Main ---

export function createTextarea(options: TextareaOptions): TextareaInstance {
  const opts = {
    placeholder: options.placeholder ?? "",
    value: options.value ?? "",
    size: options.size ?? "md",
    state: options.state ?? "default",
    disabled: options.disabled ?? false,
    readOnly: options.readOnly ?? false,
    autoResize: options.autoResize ?? true,
    minRows: options.minRows ?? 2,
    maxRows: options.maxRows ?? 0,
    fullWidth: options.fullWidth ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Textarea: container not found");

  const sz = SIZE_STYLES[opts.size];
  const colors = STATE_COLORS[opts.state];

  // Outer wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `textarea-wrapper ${opts.className}`;
  wrapper.style.cssText = `
    display:flex;flex-direction:column;gap:4px;
    ${opts.fullWidth ? "width:100%;" : ""}
    font-family:-apple-system,sans-serif;
  `;
  container.appendChild(wrapper);

  // Label
  let labelEl: HTMLLabelElement | null = null;
  if (opts.label) {
    labelEl = document.createElement("label");
    labelEl.className = "textarea-label";
    labelEl.style.cssText = `font-size:${sz.fontSize - 1}px;font-weight:500;color:#374151;display:block;margin-bottom:2px;`;
    labelEl.textContent = opts.label;
    wrapper.appendChild(labelEl);
  }

  // Main textarea
  const textarea = document.createElement("textarea");
  textarea.className = "textarea-field";
  textarea.value = opts.value;
  textarea.placeholder = opts.placeholder;
  textarea.disabled = opts.disabled;
  textarea.readOnly = opts.readOnly;
  if (opts.maxLength) textarea.maxLength = opts.maxLength;

  textarea.style.cssText = `
    width:100%;padding:${sz.padding};font-size:${sz.fontSize}px;font-family:inherit;
    line-height:1.5;color:#111827;background:${colors.bg};
    border:1px solid ${colors.border};border-radius:${sz.borderRadius}px;
    outline:none;resize:${opts.autoResize ? "none" : "vertical"};
    transition:border-color 0.15s,box-shadow 0.15s;
    box-sizing:border-box;overflow-y:hidden;
  `;

  // Set initial height based on minRows
  if (opts.autoResize) {
    setHeightFromRows(opts.minRows);
  }

  wrapper.appendChild(textarea);

  // Character counter
  let counterEl: HTMLSpanElement | null = null;
  if (opts.maxLength) {
    counterEl = document.createElement("span");
    counterEl.className = "textarea-counter";
    counterEl.style.cssText = `font-size:11px;color:#9ca3af;text-align:right;`;
    updateCounter();
    wrapper.appendChild(counterEl);
  }

  // Helper / error text
  let helperEl: HTMLDivElement | null = null;
  if (opts.helperText || opts.error) {
    helperEl = document.createElement("div");
    helperEl.className = "textarea-helper";
    helperEl.style.cssText = `font-size:12px;${opts.state === "error" ? "color:#dc2626;" : "color:#6b7280;"}`;
    helperEl.textContent = opts.error ?? opts.helperText ?? "";
    wrapper.appendChild(helperEl);
  }

  // --- Internal methods ---

  function getLineHeight(): number {
    const computed = getComputedStyle(textarea);
    return parseFloat(computed.lineHeight) || (sz.fontSize * 1.5);
  }

  function setHeightFromRows(rows: number): void {
    const lh = getLineHeight();
    const paddingY = parseFloat(getComputedStyle(textarea).paddingTop) +
      parseFloat(getComputedStyle(textarea).paddingBottom);
    textarea.style.height = `${rows * lh + paddingY}px`;
  }

  function autoResizeHeight(): void {
    if (!opts.autoResize) return;

    textarea.style.height = "auto";
    const scrollH = textarea.scrollHeight;
    const maxH = opts.maxRows > 0 ? opts.maxRows * getLineHeight() + 20 : Infinity;
    const newH = Math.min(scrollH, maxH);
    textarea.style.height = `${newH}px`;
  }

  function updateCounter(): void {
    if (counterEl) {
      const len = textarea.value.length;
      const max = opts.maxLength ?? 0;
      const nearLimit = max > 0 && len > max * 0.9;
      counterEl.textContent = `${len}/${max}`;
      counterEl.style.color = len > max ? "#dc2626" : nearLimit ? "#d97706" : "#9ca3af";
    }
  }

  function applyStateStyles(): void {
    const c = STATE_COLORS[opts.state];
    textarea.style.borderColor = c.border;
    textarea.style.background = c.bg;
    if (helperEl) {
      helperEl.style.color = opts.state === "error" ? "#dc2626" : "#6b7280";
      helperEl.textContent = opts.error ?? opts.helperText ?? "";
    }
  }

  // Event handlers
  textarea.addEventListener("input", () => {
    if (opts.autoResize) autoResizeHeight();
    updateCounter();
    opts.onChange?.(textarea.value);
  });

  textarea.addEventListener("focus", () => {
    textarea.style.boxShadow = `0 0 0 3px ${colors.focusRing}20`;
    textarea.style.borderColor = colors.focusRing;
    opts.onFocus?.();
  });

  textarea.addEventListener("blur", () => {
    textarea.style.boxShadow = "";
    applyStateStyles();
    opts.onBlur?.();
  });

  // Instance
  const instance: TextareaInstance = {
    element: wrapper,
    textareaEl: textarea,

    getValue() { return textarea.value; },

    setValue(value: string) {
      textarea.value = value;
      if (opts.autoResize) autoResizeHeight();
      updateCounter();
    },

    getState() { return opts.state; },

    setState(state: TextareaState, message?: string) {
      opts.state = state;
      if (message !== undefined) opts.error = state === "error" ? message : undefined;
      if (message !== undefined && state !== "error") opts.helperText = message;
      applyStateStyles();
    },

    focus() { textarea.focus(); },
    blur() { textarea.blur(); },

    clear() {
      textarea.value = "";
      if (opts.autoResize) setHeightFromRows(opts.minRows);
      updateCounter();
      opts.onChange?.("");
    },

    disable() {
      opts.disabled = true;
      textarea.disabled = true;
    },

    enable() {
      opts.disabled = false;
      textarea.disabled = false;
    },

    destroy() { wrapper.remove(); },
  };

  return instance;
}
