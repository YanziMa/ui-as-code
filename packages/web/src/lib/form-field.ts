/**
 * Form Field Components: Individual form field UI components (input, textarea, select,
 * checkbox, radio, switch, file upload, rating, color picker, range slider, etc.)
 * with label, help text, error display, validation state, and accessibility.
 */

// --- Types ---

export type FieldSize = "sm" | "md" | "lg";
export type InputType = "text" | "email" | "password" | "number" | "tel" | "url" | "search" | "hidden";

export interface BaseFieldOptions {
  /** Field name */
  name: string;
  /** Label text */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Help text below input */
  helpText?: string;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Required indicator */
  required?: boolean;
  /** Size variant */
  size?: FieldSize;
  /** Full width */
  fullWidth?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Container element or selector */
  container?: HTMLElement | string;
  /** Prefix icon/text */
  prefix?: string | HTMLElement;
  /** Suffix icon/text */
  suffix?: string | HTMLElement;
  /** Autofocus */
  autoFocus?: boolean;
}

export interface TextFieldOptions extends BaseFieldOptions {
  /** Input type */
  type?: InputType;
  /** Default value */
  defaultValue?: string;
  /** Max length */
  maxLength?: number;
  /** Min length */
  minLength?: number;
  /** Pattern */
  pattern?: string;
  /** Show clear button */
  clearable?: boolean;
  /** Show password toggle */
  showPasswordToggle?: boolean;
  /** Callback on value change */
  onChange?: (value: string) => void;
  /** Callback on focus */
  onFocus?: () => void;
  /** Callback on blur */
  onBlur?: () => void;
  /** Callback on Enter key */
  onEnter?: () => void;
}

export interface TextAreaOptions extends Omit<TextFieldOptions, "type"> {
  /** Number of rows */
  rows?: number;
  /** Max rows before scrolling */
  maxRows?: number;
  /** Auto-resize? */
  autoResize?: boolean;
  /** Character count */
  showCharCount?: boolean;
  /** Max characters */
  maxChars?: number;
}

export interface SelectFieldOptions extends BaseFieldOptions {
  /** Options */
  options: Array<{ value: string; label: string; disabled?: boolean; group?: string }>;
  /** Default selected value */
  defaultValue?: string;
  /** Placeholder */
  placeholder?: string;
  /** Allow clearing selection */
  clearable?: boolean;
  /** Search/filter */
  searchable?: boolean;
  /** Callback on change */
  onChange?: (value: string) => void;
}

export interface CheckboxFieldOptions extends BaseFieldOptions {
  /** Default checked state */
  defaultChecked?: boolean;
  /** Description text next to checkbox */
  description?: string;
  /** Indeterminate state */
  indeterminate?: boolean;
  /** Callback on change */
  onChange?: (checked: boolean) => void;
}

export interface SwitchFieldOptions extends BaseFieldOptions {
  /** Default checked state */
  defaultChecked?: boolean;
  /** Size variant */
  switchSize?: "sm" | "md" | "lg";
  /** Label text for on/off states */
  onLabel?: string;
  offLabel?: string;
  /** Color when on */
  activeColor?: string;
  /** Callback on change */
  onChange?: (checked: boolean) => void;
}

export interface RadioGroupOptions extends BaseFieldOptions {
  /** Radio options */
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  /** Default selected value */
  defaultValue?: string;
  /** Layout direction */
  direction?: "horizontal" | "vertical";
  /** Callback on change */
  onChange?: (value: string) => void;
}

export interface FileUploadOptions extends BaseFieldOptions {
  /** Accepted file types */
  accept?: string;
  /** Multiple files allowed? */
  multiple?: boolean;
  /** Max file size in bytes */
  maxSize?: number;
  /** Max file count */
  maxFiles?: number;
  /** Custom upload text */
  uploadText?: string;
  /** Drag & drop zone height */
  dropZoneHeight?: number;
  /** Callback on files selected */
  onFilesSelected?: (files: File[]) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface RangeSliderOptions extends BaseFieldOptions {
  /** Min value */
  min?: number;
  /** Max value */
  max?: number;
  /** Step size */
  step?: number;
  /** Default value */
  defaultValue?: number;
  /** Show value label */
  showValue?: boolean;
  /** Marks/labels at specific values */
  marks?: Array<{ value: number; label: string }>;
  /** Callback on change */
  onChange?: (value: number) => void;
}

export interface RatingFieldOptions extends BaseFieldOptions {
  /** Max rating (default: 5) */
  maxRating?: number;
  /** Default value */
  defaultValue?: number;
  /** Star icon (default: ★) */
  icon?: string;
  /** Allow half stars? */
  allowHalf?: boolean;
  /** Read-only display mode */
  readOnly?: boolean;
  /** Callback on change */
  onChange?: (rating: number) => void;
}

export interface ColorPickerOptions extends BaseFieldOptions {
  /** Default color hex value */
  defaultValue?: string;
  /** Show alpha/transparency slider */
  showAlpha?: boolean;
  /** Preset colors */
  presets?: string[];
  /** Callback on change */
  onChange?: (color: string) => void;
}

// --- Instance Types ---

export interface TextFieldInstance {
  element: HTMLDivElement;
  inputEl: HTMLInputElement;
  getValue: () => string;
  setValue: (value: string) => void;
  setError: (error: string) => void;
  clearError: () => void;
  focus: () => void;
  blur: () => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

export interface TextAreaInstance {
  element: HTMLDivElement;
  textareaEl: HTMLTextAreaElement;
  getValue: () => string;
  setValue: (value: string) => void;
  setError: (error: string) => void;
  clearError: () => void;
  focus: () => void;
  blur: () => void;
  destroy: () => void;
}

export interface SelectFieldInstance {
  element: HTMLDivElement;
  selectEl: HTMLSelectElement;
  getValue: () => string;
  setValue: (value: string) => void;
  setError: (error: string) => void;
  clearError: () => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

export interface CheckboxInstance {
  element: HTMLDivElement;
  inputEl: HTMLInputElement;
  isChecked: () => boolean;
  setChecked: (checked: boolean) => void;
  setIndeterminate: (state: boolean) => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

export interface SwitchInstance {
  element: HTMLDivElement;
  inputEl: HTMLInputElement;
  isOn: () => boolean;
  toggle: () => void;
  setOn: (on: boolean) => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

export interface RadioGroupInstance {
  element: HTMLDivElement;
  getValue: () => string;
  setValue: (value: string) => void;
  getSelected: () => string;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

export interface FileUploadInstance {
  element: HTMLDivElement;
  getFiles: () => File[];
  clear: () => void;
  setError: (error: string) => void;
  clearError: () => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

export interface RangeSliderInstance {
  element: HTMLDivElement;
  inputEl: HTMLInputElement;
  getValue: () => number;
  setValue: (value: number) => void;
  destroy: () => void;
}

export interface RatingInstance {
  element: HTMLDivElement;
  getValue: () => number;
  setValue: (rating: number) => void;
  destroy: () => void;
}

export interface ColorPickerInstance {
  element: HTMLDivElement;
  inputEl: HTMLInputElement;
  getValue: () => string;
  setValue: (color: string) => void;
  destroy: () => void;
}

// --- Size Config ---

const SIZE_STYLES: Record<FieldSize, { inputPadding: string; inputFontSize: number; labelFontSize: number }> = {
  sm: { inputPadding: "6px 10px", inputFontSize: 13, labelFontSize: 12 },
  md: { inputPadding: "8px 12px", inputFontSize: 14, labelFontSize: 13 },
  lg: { inputPadding: "10px 14px", inputFontSize: 15, labelFontSize: 14 },
};

// --- Shared Helpers ---

function resolveContainer(container?: HTMLElement | string): HTMLElement {
  if (!container) return document.createElement("div");
  return typeof container === "string"
    ? (document.querySelector(container) ?? document.createElement("div"))
    : container;
}

function createLabel(text: string, htmlFor: string, required?: boolean, size?: FieldSize): HTMLLabelElement {
  const label = document.createElement("label");
  label.htmlFor = htmlFor;
  const sz = SIZE_STYLES[size ?? "md"];
  label.style.cssText = `
    display:block;font-size:${sz.labelFontSize}px;font-weight:500;color:#374151;
    margin-bottom:4px;font-family:-apple-system,sans-serif;
  `;
  label.textContent = text;

  if (required) {
    const req = document.createElement("span");
    req.style.cssText = "color:#ef4444;margin-left:2px;";
    req.textContent = "*";
    label.appendChild(req);
  }

  return label;
}

function createHelpText(text: string): HTMLElement {
  const el = document.createElement("p");
  el.style.cssText = "font-size:12px;color:#6b7280;margin-top:4px;font-family:-apple-system,sans-serif;";
  el.textContent = text;
  return el;
}

function createErrorMsg(msg: string): HTMLElement {
  const el = document.createElement("p");
  el.className = "field-error-msg";
  el.style.cssText = "font-size:12px;color:#ef4444;margin-top:4px;font-family:-apple-system,sans-serif;display:none;";
  el.textContent = msg;
  return el;
}

function wrapField(
  content: HTMLElement,
  opts: BaseFieldOptions,
  inputId: string,
): { wrapper: HTMLDivElement; errorEl: HTMLElement | null } {
  const wrapper = document.createElement("div");
  wrapper.className = `form-field ${opts.className ?? ""}`;
  wrapper.style.cssText = `
    ${opts.fullWidth !== false ? "width:100%;" : ""}
    margin-bottom:16px;font-family:-apple-system,sans-serif;
  `;

  // Label
  if (opts.label) {
    wrapper.appendChild(createLabel(opts.label, inputId, opts.required, opts.size));
  }

  // Content
  wrapper.appendChild(content);

  // Help text
  let helpEl: HTMLElement | null = null;
  if (opts.helpText) {
    helpEl = createHelpText(opts.helpText);
    wrapper.appendChild(helpEl);
  }

  // Error message
  let errorEl: HTMLElement | null = null;
  if (opts.error) {
    errorEl = createErrorMsg(opts.error);
    errorEl.style.display = "block";
    wrapper.appendChild(errorEl);
  } else {
    errorEl = createErrorMsg("");
    wrapper.appendChild(errorEl);
  }

  return { wrapper, errorEl };
}

// --- Text Field ---

let fieldIdCounter = 0;
function nextId(): string { return `ff_${++fieldIdCounter}`; }

export function createTextField(options: TextFieldOptions): TextFieldInstance {
  const id = nextId();
  const sz = SIZE_STYLES[options.size ?? "md"];
  const container = resolveContainer(options.container);

  const input = document.createElement("input");
  input.type = options.type ?? "text";
  input.id = id;
  input.name = options.name;
  input.placeholder = options.placeholder ?? "";
  input.value = options.defaultValue ?? "";
  input.disabled = options.disabled ?? false;
  input.readOnly = options.readOnly ?? false;
  input.autocomplete = "off";
  if (options.maxLength != null) input.maxLength = options.maxLength;
  if (options.minLength != null) input.minLength = options.minLength;
  if (options.pattern) input.pattern = options.pattern;
  if (options.autoFocus) input.autofocus = true;

  input.style.cssText = `
    width:100%;padding:${sz.inputPadding};border:1px solid ${options.error ? "#fca5a5" : "#d1d5db"};
    border-radius:8px;font-size:${sz.inputFontSize}px;color:#111827;
    background:#fff;font-family:-apple-system,sans-serif;
    outline:none;transition:border-color 0.15s,box-shadow 0.15s;
    box-sizing:border-box;
    ${options.disabled ? "opacity:0.5;cursor:not-allowed;" : ""}
  `;

  // Focus/blur styles
  input.addEventListener("focus", () => {
    input.style.borderColor = "#4338ca";
    input.style.boxShadow = "0 0 0 3px rgba(67,56,202,0.1)";
    options.onFocus?.();
  });
  input.addEventListener("blur", () => {
    input.style.borderColor = options.error ? "#fca5a5" : "#d1d5db";
    input.style.boxShadow = "";
    options.onBlur?.();
  });

  // Clear button
  let clearBtn: HTMLButtonElement | null = null;
  if (options.clearable) {
    const innerWrap = document.createElement("div");
    innerWrap.style.cssText = "position:relative;display:flex;align-items:center;";
    innerWrap.appendChild(input);

    clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.innerHTML = "&times;";
    clearBtn.style.cssText = `
      position:absolute;right:8px;background:none;border:none;
      font-size:16px;color:#9ca3af;cursor:pointer;padding:2px 4px;
      display:none;line-height:1;
    `;
    clearBtn.addEventListener("click", () => {
      input.value = "";
      input.dispatchEvent(new Event("input"));
      clearBtn!.style.display = "none";
      input.focus();
    });
    innerWrap.appendChild(clearBtn);

    input.addEventListener("input", () => {
      clearBtn!.style.display = input.value ? "block" : "none";
    });

    const { wrapper, errorEl } = wrapField(innerWrap, options, id);
    container.appendChild(wrapper);

    return buildTextFieldInstance(input, wrapper, errorEl!, clearBtn, container, options);
  }

  // Password toggle
  let pwdToggle: HTMLButtonElement | null = null;
  if (options.type === "password" && options.showPasswordToggle) {
    const innerWrap = document.createElement("div");
    innerWrap.style.cssText = "position:relative;display:flex;align-items:center;";
    innerWrap.appendChild(input);

    pwdToggle = document.createElement("button");
    pwdToggle.type = "button";
    pwdToggle.textContent = "Show";
    pwdToggle.style.cssText = `
      position:absolute;right:8px;background:none;border:none;
      font-size:11px;color:#6b7280;cursor:pointer;padding:2px 4px;
    `;
    pwdToggle.addEventListener("click", () => {
      const isPwd = input.type === "password";
      input.type = isPwd ? "text" : "password";
      pwdToggle!.textContent = isPwd ? "Hide" : "Show";
    });
    innerWrap.appendChild(pwdToggle);

    const { wrapper, errorEl } = wrapField(innerWrap, options, id);
    container.appendChild(wrapper);

    return buildTextFieldInstance(input, wrapper, errorEl!, null, container, options);
  }

  // Prefix/suffix
  if (options.prefix || options.suffix) {
    const innerWrap = document.createElement("div");
    innerWrap.style.cssText = "display:flex;align-items:center;";

    if (options.prefix) {
      const pre = document.createElement("span");
      pre.style.cssText = "padding-left:10px;color:#6b7280;font-size:14px;pointer-events:none;white-space:nowrap;";
      if (typeof options.prefix === "string") pre.textContent = options.prefix;
      else pre.appendChild(options.prefix);
      innerWrap.appendChild(pre);
    }

    input.style.flex = "1";
    innerWrap.appendChild(input);

    if (options.suffix) {
      const suf = document.createElement("span");
      suf.style.cssText = "padding-right:10px;color:#6b7280;font-size:14px;pointer-events:none;white-space:nowrap;";
      if (typeof options.suffix === "string") suf.textContent = options.suffix;
      else suf.appendChild(options.suffix);
      innerWrap.appendChild(suf);
    }

    const { wrapper, errorEl } = wrapField(innerWrap, options, id);
    container.appendChild(wrapper);

    return buildTextFieldInstance(input, wrapper, errorEl!, null, container, options);
  }

  const { wrapper, errorEl } = wrapField(input, options, id);
  container.appendChild(wrapper);

  return buildTextFieldInstance(input, wrapper, errorEl!, null, container, options);
}

function buildTextFieldInstance(
  input: HTMLInputElement,
  wrapper: HTMLDivElement,
  errorEl: HTMLElement,
  _clearBtn: HTMLButtonElement | null,
  _container: HTMLElement,
  options: TextFieldOptions,
): TextFieldInstance {
  input.addEventListener("input", () => options.onChange?.(input.value));
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") options.onEnter?.(); });

  return {
    element: wrapper,
    inputEl: input,

    getValue() { return input.value; },

    setValue(v: string) { input.value = v; input.dispatchEvent(new Event("input")); },

    setError(msg: string) {
      errorEl.textContent = msg;
      errorEl.style.display = "block";
      input.style.borderColor = "#fca5a5";
    },

    clearError() {
      errorEl.style.display = "none";
      input.style.borderColor = "#d1d5db";
    },

    focus() { input.focus(); },
    blur() { input.blur(); },

    disable() { input.disabled = true; input.style.opacity = "0.5"; },
    enable() { input.disabled = false; input.style.opacity = ""; },

    destroy() { wrapper.remove(); },
  };
}

// --- Text Area ---

export function createTextArea(options: TextAreaOptions): TextAreaInstance {
  const id = nextId();
  const sz = SIZE_STYLES[options.size ?? "md"];
  const container = resolveContainer(options.container);

  const textarea = document.createElement("textarea");
  textarea.id = id;
  textarea.name = options.name;
  textarea.placeholder = options.placeholder ?? "";
  textarea.value = options.defaultValue ?? "";
  textarea.disabled = options.disabled ?? false;
  textarea.readOnly = options.readOnly ?? false;
  textarea.rows = options.rows ?? 4;
  if (options.maxLength != null) textarea.maxLength = options.maxLength;
  if (options.autoFocus) textarea.autofocus = true;

  textarea.style.cssText = `
    width:100%;padding:${sz.inputPadding};border:1px solid #d1d5db;
    border-radius:8px;font-size:${sz.inputFontSize}px;color:#111827;
    background:#fff;font-family:-apple-system,sans-serif;
    outline:none;transition:border-color 0.15s,box-shadow 0.15s;
    box-sizing:border-box;resize:vertical;min-height:80px;line-height:1.5;
    ${options.disabled ? "opacity:0.5;cursor:not-allowed;" : ""}
  `;

  textarea.addEventListener("focus", () => {
    textarea.style.borderColor = "#4338ca";
    textarea.style.boxShadow = "0 0 0 3px rgba(67,56,202,0.1)";
    options.onFocus?.();
  });
  textarea.addEventListener("blur", () => {
    textarea.style.borderColor = "#d1d5db";
    textarea.style.boxShadow = "";
    options.onBlur?.();
  });

  // Auto-resize
  if (options.autoResize) {
    textarea.addEventListener("input", () => {
      textarea.style.height = "auto";
      const maxH = options.maxRows ? `${options.maxRows * 24}px` : "400px";
      textarea.style.height = `${Math.min(textarea.scrollHeight, parseInt(maxH))}px`;
    });
  }

  // Character count
  let charCountEl: HTMLElement | null = null;
  if (options.showCharCount || options.maxChars) {
    charCountEl = document.createElement("span");
    charCountEl.style.cssText = "font-size:11px;color:#9ca3af;text-align:right;display:block;margin-top:2px;";
    updateCharCount();
    textarea.addEventListener("input", updateCharCount);
  }

  function updateCharCount(): void {
    if (!charCountEl) return;
    const len = textarea.value.length;
    const max = options.maxChars;
    if (max) {
      charCountEl.textContent = `${len}/${max}`;
      charCountEl.style.color = len > max ? "#ef4444" : "#9ca3af";
    } else {
      charCountEl.textContent = `${len} chars`;
    }
  }

  const { wrapper, errorEl } = wrapField(textarea, options, id);
  if (charCountEl) wrapper.appendChild(charCountEl);
  container.appendChild(wrapper);

  textarea.addEventListener("input", () => options.onChange?.(textarea.value));

  return {
    element: wrapper,
    textareaEl: textarea,

    getValue() { return textarea.value; },

    setValue(v: string) { textarea.value = v; if (options.autoResize) { textarea.style.height = "auto"; textarea.style.height = `${textarea.scrollHeight}px`; } },

    setError(msg: string) { errorEl.textContent = msg; errorEl.style.display = "block"; textarea.style.borderColor = "#fca5a5"; },
    clearError() { errorEl.style.display = "none"; textarea.style.borderColor = "#d1d5db"; },

    focus() { textarea.focus(); },
    blur() { textarea.blur(); },

    destroy() { wrapper.remove(); },
  };
}

// --- Select Field ---

export function createSelectField(options: SelectFieldOptions): SelectFieldInstance {
  const id = nextId();
  const sz = SIZE_STYLES[options.size ?? "md"];
  const container = resolveContainer(options.container);

  const select = document.createElement("select");
  select.id = id;
  select.name = options.name;
  select.disabled = options.disabled ?? false;
  select.style.cssText = `
    width:100%;padding:${sz.inputPadding};border:1px solid #d1d5db;
    border-radius:8px;font-size:${sz.inputFontSize}px;color:#111827;
    background:#fff;font-family:-apple-system,sans-serif;
    outline:none;transition:border-color 0.15s;cursor:pointer;
    box-sizing:border-box;appearance:none;-webkit-appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
    background-repeat:no-repeat;background-position:right 12px center;
    padding-right:32px;
    ${options.disabled ? "opacity:0.5;" : ""}
  `;

  // Placeholder option
  if (options.placeholder) {
    const phOpt = document.createElement("option");
    phOpt.value = "";
    phOpt.textContent = options.placeholder;
    phOpt.disabled = true;
    phOpt.selected = true;
    select.appendChild(phOpt);
  }

  // Grouped options
  let currentGroup: HTMLOptGroupElement | null = null;
  for (const opt of options.options) {
    if (opt.group) {
      if (!currentGroup || currentGroup.label !== opt.group) {
        currentGroup = document.createElement("optgroup");
        currentGroup.label = opt.group;
        select.appendChild(currentGroup);
      }
    } else {
      currentGroup = null;
    }

    const el = document.createElement("option");
    el.value = opt.value;
    el.textContent = opt.label;
    if (opt.disabled) el.disabled = true;
    if (opt.value === options.defaultValue) el.selected = true;

    if (currentGroup) currentGroup.appendChild(el);
    else select.appendChild(el);
  }

  select.addEventListener("change", () => options.onChange?.(select.value));

  const { wrapper, errorEl } = wrapField(select, options, id);
  container.appendChild(wrapper);

  return {
    element: wrapper,
    selectEl: select,

    getValue() { return select.value; },

    setValue(v: string) { select.value = v; },

    setError(msg: string) { errorEl.textContent = msg; errorEl.style.display = "block"; select.style.borderColor = "#fca5a5"; },
    clearError() { errorEl.style.display = "none"; select.style.borderColor = "#d1d5db"; },

    disable() { select.disabled = true; select.style.opacity = "0.5"; },
    enable() { select.disabled = false; select.style.opacity = ""; },

    destroy() { wrapper.remove(); },
  };
}

// --- Checkbox ---

export function createCheckbox(options: CheckboxFieldOptions): CheckboxInstance {
  const id = nextId();
  const container = resolveContainer(options.container);

  const wrapper = document.createElement("div");
  wrapper.className = `checkbox-field ${options.className ?? ""}`;
  wrapper.style.cssText = "display:flex;align-items:flex-start;gap:8px;margin-bottom:12px;cursor:pointer;";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.name = options.name;
  input.checked = options.defaultChecked ?? false;
  input.disabled = options.disabled ?? false;
  if (options.indeterminate) (input as any).indeterminate = true;
  input.style.cssText = `
    width:18px;height:18px;border:2px solid #d1d5db;border-radius:4px;
    cursor:pointer;appearance:none;-webkit-appearance:none;
    transition:all 0.15s;flex-shrink:0;margin-top:1px;
    position:relative;
  `;

  // Custom checkbox styling via CSS pseudo-elements simulation
  const checkStyle = document.createElement("style");
  checkStyle.textContent = `
    .checkbox-field input:checked { background:#4338ca;border-color:#4338ca; }
    .checkbox-field input:checked::after {
      content:"\\2713";position:absolute;top:50%;left:50%;
      transform:translate(-50%,-50%);color:#fff;font-size:12px;font-weight:bold;
    }
    .checkbox-field input:disabled { opacity:0.5; cursor:not-allowed; }
    .checkbox-field input:focus-visible { outline:2px solid #4338ca;outline-offset:2px; }
  `;
  document.head.appendChild(checkStyle);

  wrapper.appendChild(input);

  // Label area
  const labelArea = document.createElement("label");
  labelArea.htmlFor = id;
  labelArea.style.cssText = "font-size:14px;color:#374151;cursor:pointer;font-family:-apple-system,sans-serif;line-height:1.4;flex:1;";

  if (options.label) {
    const labelText = document.createElement("span");
    labelText.textContent = options.label;
    labelArea.appendChild(labelText);
  }
  if (options.description) {
    const desc = document.createElement("span");
    desc.style.cssText = "display:block;font-size:12px;color:#6b7280;margin-top:1px;";
    desc.textContent = options.description;
    labelArea.appendChild(desc);
  }

  wrapper.appendChild(labelArea);

  input.addEventListener("change", () => options.onChange?.(input.checked));

  container.appendChild(wrapper);

  return {
    element: wrapper,
    inputEl: input,

    isChecked() { return input.checked; },

    setChecked(c: boolean) { input.checked = c; },

    setIndeterminate(state: boolean) { (input as any).indeterminate = state; },

    disable() { input.disabled = true; },
    enable() { input.disabled = false; },

    destroy() { wrapper.remove(); },
  };
}

// --- Switch ---

export function createSwitch(options: SwitchFieldOptions): SwitchInstance {
  const id = nextId();
  const sz = options.switchSize ?? "md";
  const container = resolveContainer(options.container);

  const sizes: Record<string, { w: number; h: number; dot: number }> = {
    sm: { w: 36, h: 20, dot: 16 },
    md: { w: 44, h: 24, dot: 20 },
    lg: { w: 52, h: 28, dot: 24 },
  };
  const dim = sizes[sz];

  const wrapper = document.createElement("div");
  wrapper.className = `switch-field ${options.className ?? ""}`;
  wrapper.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:12px;cursor:pointer;";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.name = options.name;
  input.checked = options.defaultChecked ?? false;
  input.disabled = options.disabled ?? false;
  input.style.cssText = "position:absolute;opacity:0;width:0;height:0;pointer-events:none;";

  const track = document.createElement("div");
  track.style.cssText = `
    position:relative;width:${dim.w}px;height:${dim.h}px;border-radius:${dim.h / 2}px;
    background:#d1d5db;transition:background 0.2s;flex-shrink:0;cursor:pointer;
  `;

  const dot = document.createElement("div");
  dot.style.cssText = `
    position:absolute;top:2px;left:2px;width:${dim.dot - 4}px;height:${dim.dot - 4}px;
    border-radius:50%;background:#fff;transition:transform 0.2s;
    box-shadow:0 1px 3px rgba(0,0,0,0.2);
  `;
  track.appendChild(dot);

  // Update visual state
  function updateVisual(): void {
    const on = input.checked;
    track.style.background = on ? (options.activeColor ?? "#4338ca") : "#d1d5db";
    dot.style.transform = `translateX(${on ? dim.w - dim.h : 0}px)`;
  }
  updateVisual();

  wrapper.append(input, track);

  // Labels
  if (options.offLabel || options.onLabel) {
    const offLbl = document.createElement("span");
    offLbl.style.cssText = "font-size:13px;color:#6b7280;font-family:-apple-system,sans-serif;";
    offLbl.textContent = options.offLabel ?? "";
    wrapper.insertBefore(offLbl, track);

    const onLbl = document.createElement("span");
    onLbl.style.cssText = "font-size:13px;color:#374151;font-family:-apple-system,sans-serif;";
    onLbl.textContent = options.onLabel ?? "";
    wrapper.appendChild(onLbl);
  } else if (options.label) {
    const lbl = document.createElement("label");
    lbl.htmlFor = id;
    lbl.style.cssText = "font-size:14px;color:#374151;cursor:pointer;font-family:-apple-system,sans-serif;";
    lbl.textContent = options.label;
    wrapper.appendChild(lbl);
  }

  wrapper.addEventListener("click", () => {
    if (input.disabled) return;
    input.checked = !input.checked;
    updateVisual();
    options.onChange?.(input.checked);
  });

  container.appendChild(wrapper);

  return {
    element: wrapper,
    inputEl: input,

    isOn() { return input.checked; },

    toggle() { input.click(); },

    setOn(on: boolean) { input.checked = on; updateVisual(); },

    disable() { input.disabled = true; track.style.opacity = "0.5"; },
    enable() { input.disabled = false; track.style.opacity = ""; },

    destroy() { wrapper.remove(); },
  };
}

// --- Radio Group ---

export function createRadioGroup(options: RadioGroupOptions): RadioGroupInstance {
  const name = options.name;
  const container = resolveContainer(options.container);

  const wrapper = document.createElement("div");
  wrapper.className = `radio-group ${options.className ?? ""}`;
  wrapper.style.cssText = `display:flex;flex-direction:${options.direction ?? "vertical"};gap:8px;`;

  let errorEl: HTMLElement | null = null;

  if (options.label) {
    const lbl = createLabel(options.label, "", options.required, options.size);
    wrapper.insertBefore(lbl, wrapper.firstChild);
  }

  const radios: HTMLInputElement[] = [];

  for (const opt of options.options) {
    const itemWrapper = document.createElement("label");
    itemWrapper.style.cssText = "display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px;color:#374151;font-family:-apple-system,sans-serif;";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = name;
    radio.value = opt.value;
    radio.checked = opt.value === options.defaultValue;
    radio.disabled = opt.disabled ?? false;
    radio.style.cssText = `
      width:16px;height:16px;accent-color:#4338ca;cursor:pointer;flex-shrink:0;
    `;
    radios.push(radio);

    itemWrapper.appendChild(radio);

    const label = document.createElement("span");
    label.textContent = opt.label;
    if (opt.disabled) label.style.color = "#d1d5db";
    itemWrapper.appendChild(label);

    wrapper.appendChild(itemWrapper);

    radio.addEventListener("change", () => options.onChange?.(radio.value));
  }

  errorEl = createErrorMsg("");
  wrapper.appendChild(errorEl);

  container.appendChild(wrapper);

  return {
    element: wrapper,

    getValue() { return radios.find((r) => r.checked)?.value ?? ""; },

    setValue(v: string) {
      const r = radios.find((r) => r.value === v);
      if (r) r.checked = true;
    },

    getSelected() { return this.getValue(); },

    disable() { radios.forEach((r) => r.disabled = true); },
    enable() { radios.forEach((r) => r.disabled = false); },

    destroy() { wrapper.remove(); },
  };
}

// --- File Upload ---

export function createFileUpload(options: FileUploadOptions): FileUploadInstance {
  const id = nextId();
  const container = resolveContainer(options.container);

  const wrapper = document.createElement("div");
  wrapper.className = `file-upload ${options.className ?? ""}`;

  const dropZone = document.createElement("div");
  dropZone.style.cssText = `
    border:2px dashed #d1d5db;border-radius:10px;padding:${(options.dropZoneHeight ?? 120) / 2}px;
    text-align:center;cursor:pointer;transition:all 0.2s;
    background:#fafafa;display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:8px;
  `;

  const icon = document.createElement("span");
  icon.textContent = "\u{1F4CE}";
  icon.style.cssText = "font-size:32px;";
  dropZone.appendChild(icon);

  const text = document.createElement("p");
  text.style.cssText = "font-size:14px;color:#6b7280;margin:0;font-family:-apple-system,sans-serif;";
  text.textContent = options.uploadText ?? "Click or drag files here";
  dropZone.appendChild(text);

  const subText = document.createElement("p");
  subText.style.cssText = "font-size:12px;color:#9ca3af;margin:0;";
  if (options.accept) subText.textContent = `Accepted: ${options.accept}`;
  dropZone.appendChild(subText);

  const input = document.createElement("input");
  input.type = "file";
  input.id = id;
  input.name = options.name;
  input.multiple = options.multiple ?? false;
  if (options.accept) input.accept = options.accept;
  input.style.cssText = "display:none;";

  wrapper.append(dropZone, input);

  let fileList: File[] = [];
  let errorEl: HTMLElement | null = null;

  // Wrap with label/error
  const outerWrap = document.createElement("div");
  if (options.label) outerWrap.appendChild(createLabel(options.label, id, options.required, options.size));
  outerWrap.appendChild(wrapper);
  errorEl = createErrorMsg("");
  outerWrap.appendChild(errorEl);
  container.appendChild(outerWrap);

  function handleFiles(files: FileList | null): void {
    if (!files) return;
    const arr = Array.from(files);

    // Validate size
    if (options.maxSize) {
      const oversized = arr.filter((f) => f.size > options.maxSize!);
      if (oversized.length > 0) {
        setError(`File too large: ${oversized[0]!.name}`);
        options.onError?.(`File exceeds maximum size`);
        return;
      }
    }

    // Validate count
    if (options.maxFiles && fileList.length + arr.length > options.maxFiles) {
      setError(`Maximum ${options.maxFiles} files allowed`);
      options.onError?.("Too many files");
      return;
    }

    fileList = [...fileList, ...arr];
    clearError();
    updateDropZoneUI();
    options.onFilesSelected?.(fileList);
  }

  function updateDropZoneUI(): void {
    if (fileList.length > 0) {
      text.textContent = `${fileList.length} file${fileList.length > 1 ? "s" : ""} selected`;
      text.style.color = "#4338ca";
      text.style.fontWeight = "500";
    } else {
      text.textContent = options.uploadText ?? "Click or drag files here";
      text.style.color = "#6b7280";
      text.style.fontWeight = "";
    }
  }

  function setError(msg: string): void {
    if (errorEl) { errorEl.textContent = msg; errorEl.style.display = "block"; }
    dropZone.style.borderColor = "#fca5a5";
  }

  function clearError(): void {
    if (errorEl) { errorEl.style.display = "none"; }
    dropZone.style.borderColor = "#d1d5db";
  }

  // Click to open
  dropZone.addEventListener("click", () => input.click());
  input.addEventListener("change", () => handleFiles(input.files));

  // Drag & drop
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#4338ca";
    dropZone.style.background = "#eef2ff";
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "#d1d5db";
    dropZone.style.background = "#fafafa";
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#d1d5db";
    dropZone.style.background = "#fafafa";
    handleFiles(e.dataTransfer?.files ?? null);
  });

  return {
    element: outerWrap,

    getFiles() { return [...fileList]; },

    clear() { fileList = []; updateDropZoneUI(); },

    setError,
    clearError,

    disable() { dropZone.style.pointerEvents = "none"; dropZone.style.opacity = "0.5"; },
    enable() { dropZone.style.pointerEvents = ""; dropZone.style.opacity = ""; },

    destroy() { outerWrap.remove(); },
  };
}

// --- Range Slider ---

export function createRangeSlider(options: RangeSliderOptions): RangeSliderInstance {
  const id = nextId();
  const container = resolveContainer(options.container);

  const wrapper = document.createElement("div");
  wrapper.className = `range-slider ${options.className ?? ""}`;
  wrapper.style.cssText = "width:100%;";

  let valueDisplay: HTMLElement | null = null;

  if (options.label) {
    const headerRow = document.createElement("div");
    headerRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;";
    headerRow.appendChild(createLabel(options.label, id, options.required, options.size));

    if (options.showValue) {
      valueDisplay = document.createElement("span");
      valueDisplay.style.cssText = "font-size:13px;font-weight:600;color:#4338ca;font-family:-apple-system,sans-serif;";
      valueDisplay.textContent = String(options.defaultValue ?? options.min ?? 0);
      headerRow.appendChild(valueDisplay);
    }

    wrapper.appendChild(headerRow);
  }

  const input = document.createElement("input");
  input.type = "range";
  input.id = id;
  input.name = options.name;
  input.min = String(options.min ?? 0);
  input.max = String(options.max ?? 100);
  input.step = String(options.step ?? 1);
  input.value = String(options.defaultValue ?? options.min ?? 0);
  input.disabled = options.disabled ?? false;
  input.style.cssText = `
    width:100%;height:6px;-webkit-appearance:none;appearance:none;
    background:linear-gradient(to right, #4338ca 0%, #4338ca ${(parseFloat(input.value) - parseFloat(input.min)) / (parseFloat(input.max) - parseFloat(input.min)) * 100}%, #e5e7eb ${(parseFloat(input.value) - parseFloat(input.min)) / (parseFloat(input.max) - parseFloat(input.min)) * 100}%, #e5e7eb 100%);
    border-radius:3px;outline:none;cursor:pointer;
  `;

  // Custom thumb style
  const thumbStyle = document.createElement("style");
  thumbStyle.textContent = `
    .range-slider input::-webkit-slider-thumb {
      -webkit-appearance:none;width:18px;height:18px;border-radius:50%;
      background:#4338ca;cursor:pointer;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);
    }
    .range-slider input::-moz-range-thumb {
      width:18px;height:18px;border-radius:50%;
      background:#4338ca;cursor:pointer;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);
    }
  `;
  document.head.appendChild(thumbStyle);

  wrapper.appendChild(input);

  // Marks
  if (options.marks) {
    const marksContainer = document.createElement("div");
    marksContainer.style.cssText = "display:flex;justify-content:space-between;margin-top:4px;";
    for (const mark of options.marks) {
      const m = document.createElement("span");
      m.style.cssText = "font-size:11px;color:#9ca3af;font-family:-apple-system,sans-serif;";
      m.textContent = mark.label;
      marksContainer.appendChild(m);
    }
    wrapper.appendChild(marksContainer);
  }

  input.addEventListener("input", () => {
    const pct = (parseFloat(input.value) - parseFloat(input.min)) / (parseFloat(input.max) - parseFloat(input.min)) * 100;
    input.style.background = `linear-gradient(to right, #4338ca 0%, #4338ca ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`;
    if (valueDisplay) valueDisplay.textContent = input.value;
    options.onChange?.(parseFloat(input.value));
  });

  container.appendChild(wrapper);

  return {
    element: wrapper,
    inputEl: input,

    getValue() { return parseFloat(input.value); },

    setValue(v: number) {
      input.value = String(v);
      input.dispatchEvent(new Event("input"));
    },

    destroy() { wrapper.remove(); },
  };
}

// --- Rating ---

export function createRating(options: RatingFieldOptions): RatingInstance {
  const id = nextId();
  const max = options.maxRating ?? 5;
  const container = resolveContainer(options.container);

  const wrapper = document.createElement("div");
  wrapper.className = `rating-field ${options.className ?? ""}`;
  wrapper.style.cssText = "display:inline-flex;gap:2px;";

  if (options.label) {
    const outer = document.createElement("div");
    outer.appendChild(createLabel(options.label, id, options.required, options.size));
    outer.appendChild(wrapper);
    container.appendChild(outer);
  } else {
    container.appendChild(wrapper);
  }

  let currentValue = options.defaultValue ?? 0;
  const stars: HTMLElement[] = [];

  for (let i = 1; i <= max; i++) {
    const star = document.createElement("button");
    star.type = "button";
    star.setAttribute("aria-label", `Rate ${i} out of ${max}`);
    star.dataset.value = String(i);
    star.style.cssText = `
      background:none;border:none;cursor:pointer;font-size:24px;
      padding:2px;line-height:1;color:#d1d5db;transition:color 0.1s,transform 0.1s;
      ${options.readOnly ? "cursor:default;" : ""}
    `;
    star.textContent = options.icon ?? "\u2605";
    stars.push(star);
    wrapper.appendChild(star);

    if (!options.readOnly) {
      star.addEventListener("mouseenter", () => renderStars(i));
      star.addEventListener("mouseleave", () => renderStars(currentValue));
      star.addEventListener("click", () => {
        currentValue = i;
        renderStars(i);
        options.onChange?.(i);
      });
    }
  }

  function renderStars(count: number): void {
    stars.forEach((s, idx) => {
      s.style.color = idx < count ? "#fbbf24" : "#d1d5db";
      s.style.transform = idx < count ? "scale(1.1)" : "scale(1)";
    });
  }

  renderStars(currentValue);

  return {
    element: wrapper,

    getValue() { return currentValue; },

    setValue(rating: number) {
      currentValue = Math.max(0, Math.min(max, rating));
      renderStars(currentValue);
    },

    destroy() { wrapper.parentElement?.remove(); },
  };
}

// --- Color Picker ---

export function createColorPicker(options: ColorPickerOptions): ColorPickerInstance {
  const id = nextId();
  const container = resolveContainer(options.container);

  const wrapper = document.createElement("div");
  wrapper.className = `color-picker ${options.className ?? ""}`;
  wrapper.style.cssText = "display:flex;align-items:center;gap:8px;";

  if (options.label) {
    const outer = document.createElement("div");
    outer.style.cssText = "margin-bottom:12px;";
    outer.appendChild(createLabel(options.label, id, options.required, options.size));
    outer.appendChild(wrapper);
    container.appendChild(outer);
  } else {
    container.appendChild(wrapper);
  }

  const input = document.createElement("input");
  input.type = "color";
  input.id = id;
  input.name = options.name;
  input.value = options.defaultValue ?? "#000000";
  input.disabled = options.disabled ?? false;
  input.style.cssText = `
    width:40px;height:40px;border:2px solid #d1d5db;border-radius:8px;
    cursor:pointer;padding:2px;flex-shrink:0;
  `;

  const hexInput = document.createElement("input");
  hexInput.type = "text";
  hexInput.value = input.value;
  hexInput.spellcheck = false;
  hexInput.maxLength = 7;
  hexInput.style.cssText = `
    width:80px;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;
    font-size:13px;font-family:'SF Mono',monospace;text-transform:uppercase;
  `;

  input.addEventListener("input", () => {
    hexInput.value = input.value.toUpperCase();
    options.onChange?.(input.value);
  });

  hexInput.addEventListener("change", () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hexInput.value)) {
      input.value = hexInput.value;
      options.onChange?.(hexInput.value);
    }
  });

  // Presets
  if (options.presets && options.presets.length > 0) {
    const presetContainer = document.createElement("div");
    presetContainer.style.cssText = "display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;";
    for (const color of options.presets) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = color;
      btn.style.cssText = `
        width:24px;height:24px;border-radius:4px;border:2px solid transparent;
        cursor:pointer;background:${color};padding:0;transition:border-color 0.15s;
      `;
      btn.addEventListener("click", () => {
        input.value = color;
        hexInput.value = color.toUpperCase();
        options.onChange?.(color);
      });
      btn.addEventListener("mouseenter", () => { btn.style.borderColor = "#4338ca"; });
      btn.addEventListener("mouseleave", () => { btn.style.borderColor = "transparent"; });
      presetContainer.appendChild(btn);
    }
    wrapper.parentElement?.appendChild(presetContainer);
  }

  wrapper.append(input, hexInput);
  if (!options.label) container.appendChild(wrapper);

  return {
    element: wrapper.parentElement ?? wrapper,
    inputEl: input,

    getValue() { return input.value; },

    setColor(color: string) {
      input.value = color;
      hexInput.value = color.toUpperCase();
    },

    destroy() { (wrapper.parentElement ?? wrapper).remove(); },
  } as unknown as ColorPickerInstance;
}
