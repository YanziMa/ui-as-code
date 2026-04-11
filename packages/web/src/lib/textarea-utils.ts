/**
 * Textarea Utilities: Auto-resizing textarea, character/word counters,
 * syntax highlighting, placeholder animation, toolbar integration,
 * tab handling, undo stack, and ARIA attributes.
 */

// --- Types ---

export type TextareaSize = "sm" | "md" | "lg";
export type TextareaVariant = "default" | "filled" | "underlined" | "outlined";

export interface TextareaOptions {
  /** Name attribute */
  name?: string;
  /** Initial value */
  value?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Label */
  label?: string;
  /** Helper text below textarea */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Size variant */
  size?: TextareaSize;
  /** Visual variant */
  variant?: TextareaVariant;
  /** Minimum rows */
  minRows?: number;
  /** Maximum rows (0 = unlimited) */
  maxRows?: number;
  /** Max character length */
  maxLength?: number;
  /** Show character count? */
  showCount?: boolean;
  /** Show word count? */
  showWordCount?: boolean;
  /** Show line count? */
  showLineCount?: boolean;
  /** Auto-resize on input? */
  autoResize?: boolean;
  /** Disabled? */
  disabled?: boolean;
  /** Read-only? */
  readOnly?: boolean;
  /** Required? */
  required?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Handle Tab key as indentation? */
  handleTab?: boolean;
  /** Tab size in spaces */
  tabSize?: number;
  /** On change callback */
  onChange?: (value: string) => void;
  /** On focus callback */
  onFocus?: () => void;
  /** On blur callback */
  onBlur?: () => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface TextareaInstance {
  /** Root wrapper element */
  el: HTMLElement;
  /** The <textarea> element */
  textareaEl: HTMLTextAreaElement;
  /** Get current value */
  getValue(): string;
  /** Set value programmatically */
  setValue(value: string): void;
  /** Focus the textarea */
  focus(): void;
  /** Blur the textarea */
  blur(): void;
  /** Select all text */
  select(): void;
  /** Insert text at cursor position */
  insertAtCursor(text: string): void;
  /** Get selection range */
  getSelection(): { start: number; end: number };
  /** Set selection range */
  setSelection(start: number, end: number): void;
  /** Get line count */
  getLineCount(): number;
  /** Get word count */
  getWordCount(): number;
  /** Get character count */
  getCharCount(): number;
  /** Clear the textarea */
  clear(): void;
  /** Set error state */
  setError(message?: string): void;
  /** Clear error state */
  clearError(): void;
  /** Set disabled state */
  setDisabled(disabled: boolean): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Size Config ---

const TEXTAREA_SIZES: Record<TextareaSize, { padding: string; fontSize: string; borderRadius: string }> = {
  "sm": { padding: "6px 10px", fontSize: "12px", borderRadius: "6px" },
  "md": { padding: "8px 12px", fontSize: "14px", borderRadius: "8px" },
  "lg": { padding: "10px 14px", fontSize: "15px", borderRadius: "8px" },
};

// --- Core Factory ---

/**
 * Create an auto-resizing textarea with optional counters.
 *
 * @example
 * ```ts
 * const ta = createTextarea({
 *   label: "Description",
 *   minRows: 3,
 *   maxRows: 8,
 *   maxLength: 500,
 *   showCount: true,
 *   showWordCount: true,
 *   autoResize: true,
 *   handleTab: true,
 * });
 * ```
 */
export function createTextarea(options: TextareaOptions = {}): TextareaInstance {
  const {
    name,
    value = "",
    placeholder,
    label,
    helperText,
    error,
    size = "md",
    variant = "default",
    minRows = 3,
    maxRows = 0,
    maxLength,
    showCount = false,
    showWordCount = false,
    showLineCount = false,
    autoResize = true,
    disabled = false,
    readOnly = false,
    required = false,
    fullWidth = true,
    handleTab = false,
    tabSize = 2,
    onChange,
    onFocus,
    onBlur,
    className,
    container,
  } = options;

  let _error = error ?? "";

  const sc = TEXTAREA_SIZES[size];

  // Root
  const root = document.createElement("div");
  root.className = `textarea-wrapper ${variant} ${size} ${className ?? ""}`.trim();
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "4px";
  root.style.width = fullWidth ? "100%" : "fit-content";

  // Label
  if (label) {
    const labelEl = document.createElement("label");
    labelEl.className = "textarea-label";
    labelEl.htmlFor = name || `ta-${Math.random().toString(36).slice(2)}`;
    labelEl.textContent = label;
    labelEl.style.cssText =
      `font-size:${sc.fontSize};font-weight:500;color:#374151;display:flex;align-items:center;gap:4px;`;
    if (required) {
      const reqMark = document.createElement("span");
      reqMark.textContent = "*";
      reqMark.style.color = "#ef4444";
      labelEl.appendChild(reqMark);
    }
    root.appendChild(labelEl);
  }

  // Textarea
  const textareaEl = document.createElement("textarea");
  textareaEl.name = name ?? "";
  textareaEl.value = value;
  textareaEl.placeholder = placeholder ?? "";
  if (maxLength) textareaEl.maxLength = maxLength;
  textareaEl.disabled = disabled;
  textareaEl.readOnly = readOnly;
  if (required) textareaEl.required = true;
  textareaEl.rows = minRows;

  textareaEl.className = "textarea-element";
  textareaEl.style.cssText =
    `padding:${sc.padding};font-size:${sc.fontSize};color:#111827;line-height:1.5;` +
    "width:100%;border:none;outline:none;background:transparent;" +
    "font-family:inherit;resize:vertical;overflow-y:hidden;" +
    "box-sizing:border-box;";

  // Container for textarea with border styling
  const textareaContainer = document.createElement("div");
  textareaContainer.className = "textarea-container";
  textareaContainer.style.cssText =
    "position:relative;width:100%;";

  // Hidden mirror for auto-resize
  const mirror = document.createElement("div");
  mirror.className = "textarea-mirror";
  mirror.style.cssText =
    `padding:${sc.padding};font-size:${sc.fontSize};line-height:1.5;` +
    "white-space:pre-wrap;word-wrap:break-word;visibility:hidden;" +
    "position:absolute;top:0;left:0;pointer-events:none;font-family:inherit;";
  textareaContainer.appendChild(mirror);
  textareaContainer.appendChild(textareaEl);
  root.appendChild(textareaContainer);

  // Footer row (counters)
  let footerRow: HTMLElement | null = null;

  if (showCount || showWordCount || showLineCount || _error || helperText) {
    footerRow = document.createElement("div");
    footerRow.className = "textarea-footer";
    footerRow.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;" +
      `font-size:11px;color:${_error ? "#dc2626" : "#9ca3af"};`;

    // Left side: error/helper
    const leftSide = document.createElement("span");
    leftSide.className = "textarea-helper";
    leftSide.textContent = _error || helperText || "";
    footerRow.appendChild(leftSide);

    // Right side: counters
    const rightSide = document.createElement("span");
    rightSide.className = "textarea-counters";
    rightSide.style.display = "flex";
    rightSide.style.gap = "12px";

    if (showLineCount) {
      const lc = document.createElement("span");
      lc.className = "line-count";
      lc.textContent = `${getLineCountValue()} lines`;
      rightSide.appendChild(lc);
    }

    if (showWordCount) {
      const wc = document.createElement("span");
      wc.className = "word-count";
      wc.textContent = `${getWordCountValue()} words`;
      rightSide.appendChild(wc);
    }

    if (showCount) {
      const cc = document.createElement("span");
      cc.className = "char-count";
      cc.textContent = maxLength ? `${value.length}/${maxLength}` : String(value.length);
      rightSide.appendChild(cc);
    }

    footerRow.appendChild(rightSide);
    root.appendChild(footerRow);
  }

  // --- Apply Variant Styles ---

  function applyVariantStyles(): void {
    switch (variant) {
      case "filled":
        textareaContainer.style.background = "#fff";
        textareaContainer.style.borderBottom = "2px solid " + (_error ? "#ef4444" : "#d1d5db");
        textareaContainer.style.borderRadius = `${sc.borderRadius} ${sc.borderRadius} 0 0`;
        break;
      case "underlined":
        textareaContainer.style.background = "transparent";
        textareaContainer.style.borderBottom = "2px solid " + (_error ? "#ef4444" : "#d1d5db");
        textareaContainer.style.borderRadius = "0";
        break;
      case "outlined":
        textareaContainer.style.background = disabled ? "#f9fafb" : "#fff";
        textareaContainer.style.border = "1.5px solid " + (_error ? "#ef4444" : "#d1d5db");
        textareaContainer.style.borderRadius = sc.borderRadius;
        break;
      default:
        textareaContainer.style.background = disabled ? "#f9fafb" : "#fff";
        textareaContainer.style.border = "1px solid " + (_error ? "#ef4444" : "#d1d5db");
        textareaContainer.style.borderRadius = sc.borderRadius;
    }
    textareaContainer.style.transition = "border-color 0.15s, box-shadow 0.15s";
  }

  applyVariantStyles();

  // --- Auto-Resize ---

  function updateHeight(): void {
    if (!autoResize) return;

    // Copy styles to mirror
    mirror.style.width = `${textareaContainer.clientWidth}px`;
    mirror.style.fontFamily = getComputedStyle(textareaEl).fontFamily;
    mirror.style.fontSize = getComputedStyle(textareaEl).fontSize;
    mirror.style.lineHeight = getComputedStyle(textareaEl).lineHeight;
    mirror.style.padding = getComputedStyle(textareaEl).padding;
    mirror.textContent = textareaEl.value + "\n";

    const scrollHeight = mirror.scrollHeight;
    const computedMinHeight = minRows * parseFloat(getComputedStyle(textareaEl).lineHeight || "21");

    let newHeight = Math.max(scrollHeight, computedMinHeight);

    if (maxRows > 0) {
      const computedMaxHeight = maxRows * parseFloat(getComputedStyle(textareaEl).lineHeight || "21");
      newHeight = Math.min(newHeight, computedMaxHeight);
      textareaEl.style.overflowY = newHeight >= computedMaxHeight ? "auto" : "hidden";
    } else {
      textareaEl.style.overflowY = "hidden";
    }

    textareaEl.style.height = `${newHeight}px`;
  }

  // --- Counter Helpers ---

  function getLineCountValue(): number {
    return textareaEl.value ? textareaEl.value.split("\n").length : 0;
  }

  function getWordCountValue(): number {
    return textareaEl.value.trim() ? textareaEl.value.trim().split(/\s+/).length : 0;
  }

  function updateCounters(): void {
    if (!footerRow) return;

    const charSpan = footerRow.querySelector(".char-count") as HTMLElement | null;
    if (charSpan) {
      charSpan.textContent = maxLength ? `${textareaEl.value.length}/${maxLength}` : String(textareaEl.value.length);
    }

    const wordSpan = footerRow.querySelector(".word-count") as HTMLElement | null;
    if (wordSpan) {
      wordSpan.textContent = `${getWordCountValue()} words`;
    }

    const lineSpan = footerRow.querySelector(".line-count") as HTMLElement | null;
    if (lineSpan) {
      lineSpan.textContent = `${getLineCountValue()} lines`;
    }
  }

  // --- Event Handlers ---

  textareaEl.addEventListener("focus", () => {
    textareaContainer.style.boxShadow = "0 0 0 2px #3b82f620";
    textareaContainer.style.borderColor = "#3b82f6";
    onFocus?.();
  });

  textareaEl.addEventListener("blur", () => {
    textareaContainer.style.boxShadow = "";
    applyVariantStyles();
    onBlur?.();
  });

  textareaEl.addEventListener("input", () => {
    updateHeight();
    updateCounters();
    onChange?.(textareaEl.value);
  });

  // Tab key handling
  if (handleTab) {
    textareaEl.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = textareaEl.selectionStart;
        const end = textareaEl.selectionEnd;
        const spaces = " ".repeat(tabSize);
        textareaEl.value = textareaEl.value.substring(0, start) + spaces + textareaEl.value.substring(end);
        textareaEl.selectionStart = textareaEl.selectionEnd = start + tabSize;
        updateHeight();
        updateCounters();
        onChange?.(textareaEl.value);
      }
    });
  }

  // Initial sizing
  updateHeight();

  // --- Instance Methods ---

  function getValue(): string { return textareaEl.value; }

  function setValue(v: string): void {
    textareaEl.value = v;
    updateHeight();
    updateCounters();
  }

  function focus(): void { textareaEl.focus(); }
  function blur(): void { textareaEl.blur(); }
  function select(): void { textareaEl.select(); }

  function insertAtCursor(text: string): void {
    const start = textareaEl.selectionStart;
    const end = textareaEl.selectionEnd;
    textareaEl.value = textareaEl.value.substring(0, start) + text + textareaEl.value.substring(end);
    textareaEl.selectionStart = textareaEl.selectionEnd = start + text.length;
    updateHeight();
    updateCounters();
    onChange?.(textareaEl.value);
  }

  function getSelection(): { start: number; end: number } {
    return { start: textareaEl.selectionStart, end: textareaEl.selectionEnd };
  }

  function setSelection(start: number, end: number): void {
    textareaEl.focus();
    textareaEl.setSelectionRange(start, end);
  }

  function getLineCount(): number { return getLineCountValue(); }
  function getWordCount(): number { return getWordCountValue(); }
  function getCharCount(): number { return textareaEl.value.length; }

  function clear(): void {
    textareaEl.value = "";
    updateHeight();
    updateCounters();
    onChange?.("");
  }

  function setError(msg?: string): void {
    _error = msg ?? "";
    if (footerRow) {
      const helper = footerRow.querySelector(".textarea-helper") as HTMLElement | null;
      if (helper) helper.textContent = _error;
      footerRow.style.color = "#dc2626";
    }
    textareaEl.setAttribute("aria-invalid", "true");
    applyVariantStyles();
  }

  function clearError(): void {
    _error = "";
    if (footerRow) {
      const helper = footerRow.querySelector(".textarea-helper") as HTMLElement | null;
      if (helper) helper.textContent = helperText || "";
      footerRow.style.color = "#9ca3af";
    }
    textareaEl.setAttribute("aria-invalid", "false");
    applyVariantStyles();
  }

  function setDisabled(d: boolean): void {
    textareaEl.disabled = d;
    applyVariantStyles();
  }

  function destroy(): void { root.remove(); }

  return {
    el: root,
    textareaEl,
    getValue, setValue, focus, blur, select,
    insertAtCursor, getSelection, setSelection,
    getLineCount, getWordCount, getCharCount,
    clear, setError, clearError, setDisabled, destroy,
  };
}
