/**
 * Checkbox Utilities: Checkbox, checkbox group, indeterminate state,
 * switch/toggle variants, card-style checkboxes, ARIA attributes,
 * and validation integration.
 */

// --- Types ---

export type CheckboxSize = "sm" | "md" | "lg";
export type CheckboxVariant = "default" | "filled" | "outlined" | "card";

export interface CheckboxOption {
  /** Option value */
  value: string;
  /** Display label */
  label: string;
  /** Description text */
  description?: string;
  /** Disabled? */
  disabled?: boolean;
  /** Icon (HTML string) */
  icon?: string;
}

export interface CheckboxOptions {
  /** Checkbox name (for form submission) */
  name?: string;
  /** Label text for single checkbox or group label */
  label?: string;
  /** Checked state */
  checked?: boolean;
  /** Indeterminate state? */
  indeterminate?: boolean;
  /** Size variant */
  size?: CheckboxSize;
  /** Visual variant */
  variant?: CheckboxVariant;
  /** Disabled? */
  disabled?: boolean;
  /** Required? */
  required?: boolean;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Value (for form) */
  value?: string;
  /** On change callback */
  onChange?: (checked: boolean, value?: string) => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface CheckboxGroupOptions {
  /** Group label */
  label?: string;
  /** Options to render as checkboxes */
  options: CheckboxOption[];
  /** Selected values */
  selectedValues?: Set<string> | string[];
  /** Layout direction */
  direction?: "horizontal" | "vertical";
  /** Size variant */
  size?: CheckboxSize;
  /** Visual variant */
  variant?: CheckboxVariant;
  /** Allow "select all"? */
  selectAll?: boolean;
  /** "Select all" label */
  selectAllLabel?: string;
  /** Minimum selections required */
  minSelect?: number;
  /** Maximum selections allowed */
  maxSelect?: number;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Disabled? */
  disabled?: boolean;
  /** On change callback with all selected values */
  onChange?: (values: string[], options: CheckboxOption[]) => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface CheckboxInstance {
  /** Root wrapper element */
  el: HTMLElement;
  /** The native <input type="checkbox"> element */
  inputEl: HTMLInputElement;
  /** Get checked state */
  isChecked(): boolean;
  /** Set checked state */
  setChecked(checked: boolean): void;
  /** Set indeterminate state */
  setIndeterminate(value: boolean): void;
  /** Toggle checked state */
  toggle(): void;
  /** Set disabled state */
  setDisabled(disabled: boolean): void;
  /** Set error state */
  setError(message?: string): void;
  /** Clear error state */
  clearError(): void;
  /** Focus the checkbox */
  focus(): void;
  /** Destroy and cleanup */
  destroy(): void;
}

export interface CheckboxGroupInstance {
  /** Root wrapper element */
  el: HTMLElement;
  /** Get all selected values */
  getValues(): string[];
  /** Set selected values */
  setValues(values: string[]): void;
  /** Select all options */
  selectAll(): void;
  /** Deselect all options */
  deselectAll(): void;
  /** Check if a specific option is selected */
  isSelected(value: string): boolean;
  /** Get count of selected items */
  getSelectedCount(): number;
  /** Enable/disable a specific option */
  setOptionDisabled(value: string, disabled: boolean): void;
  /** Add an option dynamically */
  addOption(option: CheckboxOption): void;
  /** Remove an option by value */
  removeOption(value: string): void;
  /** Validate selection constraints */
  validate(): { valid: boolean; message?: string };
  /** Set disabled state for entire group */
  setDisabled(disabled: boolean): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Size Config ---

const CHECKBOX_SIZES: Record<CheckboxSize, { size: string; fontSize: string; gap: string }> = {
  "sm": { size: "14px", fontSize: "12px", gap: "6px" },
  "md": { size: "18px", fontSize: "14px", gap: "8px" },
  "lg": { size: "22px", fontSize: "15px", gap: "10px" },
};

// --- Single Checkbox Factory ---

/**
 * Create a styled checkbox component.
 *
 * @example
 * ```ts
 * const cb = createCheckbox({
 *   label: "Accept terms",
 *   required: true,
 *   onChange: (checked) => console.log(checked),
 * });
 * ```
 */
export function createCheckbox(options: CheckboxOptions = {}): CheckboxInstance {
  const {
    name,
    label,
    checked = false,
    indeterminate = false,
    size = "md",
    variant = "default",
    disabled = false,
    required = false,
    error,
    helperText,
    value,
    onChange,
    className,
    container,
  } = options;

  let _error = error ?? "";
  const sc = CHECKBOX_SIZES[size];

  // Root
  const root = document.createElement("label");
  root.className = `checkbox-wrapper ${variant} ${size} ${className ?? ""}`.trim();
  root.style.cssText =
    "display:inline-flex;align-items:flex-start;gap:" + sc.gap + ";" +
    "cursor:" + (disabled ? "not-allowed" : "pointer") + ";" +
    "user-select:none;position:relative;" +
    (disabled ? "opacity:0.5;" : "");

  // Hidden native input
  const inputEl = document.createElement("input");
  inputEl.type = "checkbox";
  inputEl.name = name ?? "";
  inputEl.checked = checked;
  if (value !== undefined) inputEl.value = value;
  inputEl.disabled = disabled;
  if (required) inputEl.required = true;
  inputEl.style.cssText = "position:absolute;opacity:0;width:0;height:0;margin:0;";
  if (indeterminate) inputEl.indeterminate = true;

  // Visual checkbox
  const visual = document.createElement("span");
  visual.className = "checkbox-visual";
  visual.style.cssText =
    `display:flex;align-items:center;justify-content:center;width:${sc.size};height:${sc.size};` +
    "flex-shrink:0;border-radius:4px;border:2px solid #d1d5db;background:#fff;" +
    "transition:all 0.15s ease;position:relative;top:1px;";

  // Checkmark
  const checkmark = document.createElement("svg");
  checkmark.style.cssText =
    "width:60%;height:60%;stroke:#fff;stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round;" +
    "opacity:0;transform:scale(0);transition:all 0.12s ease;";
  checkmark.setAttribute("viewBox", "0 0 24 24");
  checkmark.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
  visual.appendChild(checkmark);

  // Indeterminate dash
  const indeterminateMark = document.createElement("span");
  indeterminateMark.innerHTML = "&minus;";
  indeterminateMark.style.cssText =
    "color:#fff;font-size:bold;font-weight:700;font-size:14px;opacity:0;transition:opacity 0.12s;";
  visual.appendChild(indeterminateMark);

  root.appendChild(inputEl);
  root.appendChild(visual);

  // Label area
  if (label || helperText || _error) {
    const labelArea = document.createElement("div");
    labelArea.className = "checkbox-label-area";
    labelArea.style.display = "flex";
    labelArea.style.flexDirection = "column";
    labelArea.style.gap = "2px";

    if (label) {
      const labelEl = document.createElement("span");
      labelEl.className = "checkbox-label";
      labelEl.textContent = label;
      labelEl.style.cssText =
        `font-size:${sc.fontSize};font-weight:400;color:${disabled ? "#9ca3af" : "#374151"};line-height:1.3;`;
      if (required) {
        labelEl.textContent += " *";
        // Could add styling for required indicator
      }
      labelArea.appendChild(labelEl);
    }

    if (_error) {
      const errEl = document.createElement("span");
      errEl.className = "checkbox-error";
      errEl.textContent = _error;
      errEl.style.cssText = "font-size:11px;color:#dc2626;";
      labelArea.appendChild(errEl);
    } else if (helperText) {
      const helpEl = document.createElement("span");
      helpEl.className = "checkbox-helper";
      helpEl.textContent = helperText;
      helpEl.style.cssText = "font-size:11px;color:#9ca3af;";
      labelArea.appendChild(helpEl);
    }

    root.appendChild(labelArea);
  }

  // --- State Update ---

  function updateVisual(): void {
    const c = inputEl.checked;
    const ind = inputEl.indeterminate;

    checkmark.style.opacity = (c && !ind) ? "1" : "0";
    checkmark.style.transform = (c && !ind) ? "scale(1)" : "scale(0)";
    indeterminateMark.style.opacity = ind ? "1" : "0";

    if (c || ind) {
      visual.style.background = "#3b82f6";
      visual.style.borderColor = "#3b82f6";
    } else {
      visual.style.background = "#fff";
      visual.style.borderColor = _error ? "#ef4444" : "#d1d5db";
    }
  }

  updateVisual();

  // --- Events ---

  inputEl.addEventListener("change", () => {
    updateVisual();
    onChange?.(inputEl.checked, value);
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      inputEl.click();
    }
  });

  // --- Instance ---

  return {
    el: root,
    inputEl,

    isChecked() { return inputEl.checked; },

    setChecked(c: boolean) {
      inputEl.checked = c;
      inputEl.indeterminate = false;
      updateVisual();
    },

    setIndeterminate(val: boolean) {
      inputEl.indeterminate = val;
      updateVisual();
    },

    toggle() {
      inputEl.checked = !inputEl.checked;
      inputEl.indeterminate = false;
      updateVisual();
      onChange?.(inputEl.checked, value);
    },

    setDisabled(d: boolean) {
      inputEl.disabled = d;
      root.style.opacity = d ? "0.5" : "1";
      root.style.cursor = d ? "not-allowed" : "pointer";
    },

    setError(msg?: string) {
      _error = msg ?? "";
      updateVisual();
      const errEl = root.querySelector(".checkbox-error") as HTMLElement | null;
      if (errEl && _error) errEl.textContent = _error;
    },

    clearError() {
      _error = "";
      updateVisual();
      const errEl = root.querySelector(".checkbox-error") as HTMLElement | null;
      if (errEl) errEl.remove();
    },

    focus() { inputEl.focus(); },
    destroy() { root.remove(); },
  };
}

// --- Checkbox Group Factory ---

/**
 * Create a group of checkboxes.
 *
 * @example
 * ```ts
 * const group = createCheckboxGroup({
 *   label: "Notifications",
 *   options: [
 *     { value: "email", label: "Email" },
 *     { value: "sms", label: "SMS" },
 *     { value: "push", label: "Push notifications" },
 *   ],
 *   selectedValues: ["email"],
 *   onChange: (vals) => console.log(vals),
 * });
 * ```
 */
export function createCheckboxGroup(options: CheckboxGroupOptions): CheckboxGroupInstance {
  const {
    label,
    options,
    selectedValues: initialSelected,
    direction = "vertical",
    size = "md",
    variant = "default",
    selectAll: showSelectAll = false,
    selectAllLabel = "Select All",
    minSelect,
    maxSelect,
    error,
    helperText,
    disabled = false,
    onChange,
    className,
    container,
  } = options;

  let _selected = new Set<string>(
    Array.isArray(initialSelected) ? initialSelected : initialSelected ? [...initialSelected] : []
  );
  let _error = error ?? "";

  const sc = CHECKBOX_SIZES[size];
  const instances = new Map<string, { cb: CheckboxInstance; opt: CheckboxOption }>();

  // Root
  const root = document.createElement("fieldset");
  root.className = `checkbox-group ${variant} ${size} ${className ?? ""}`.trim();
  root.style.cssText =
    "border:none;padding:0;margin:0;display:flex;flex-direction:" + direction + ";gap:10px;" +
    (direction === "horizontal" ? "flex-wrap:wrap;" : "");

  // Group label
  if (label) {
    const legend = document.createElement("legend");
    legend.textContent = label;
    legend.style.cssText =
      `font-size:${sc.fontSize};font-weight:600;color:#374151;padding-bottom:6px;`;
    root.prepend(legend);
  }

  // Select-all checkbox
  let selectAllCb: CheckboxInstance | null = null;

  if (showSelectAll) {
    selectAllCb = createCheckbox({
      label: selectAllLabel,
      checked: _selected.size === options.length && options.length > 0,
      indeterminate: _selected.size > 0 && _selected.size < options.length,
      size,
      variant,
      onChange: (checked) => {
        if (checked) instance.selectAll();
        else instance.deselectAll();
      },
    });
    root.appendChild(selectAllCb.el);
  }

  // Render each option
  options.forEach((opt) => {
    const cb = createCheckbox({
      label: opt.label,
      checked: _selected.has(opt.value),
      disabled: opt.disabled || disabled,
      size,
      variant,
      value: opt.value,
      onChange: (checked) => handleOptionChange(opt.value, checked),
    });

    instances.set(opt.value, { cb, opt });
    root.appendChild(cb.el);
  });

  // Error / helper below group
  if (_error || helperText) {
    const footer = document.createElement("div");
    footer.style.cssText = `font-size:11px;color:${_error ? "#dc2626" : "#9ca3af"};margin-top:4px;`;
    footer.textContent = _error || helperText || "";
    root.appendChild(footer);
  }

  // --- Internal ---

  function handleOptionChange(value: string, checked: boolean): void {
    if (checked) {
      if (maxSelect !== undefined && _selected.size >= maxSelect && !_selected.has(value)) {
        // Revert - max reached
        const inst = instances.get(value);
        if (inst) inst.cb.setChecked(false);
        return;
      }
      _selected.add(value);
    } else {
      if (minSelect !== undefined && _selected.size <= minSelect && _selected.has(value)) {
        // Revert - min reached
        const inst = instances.get(value);
        if (inst) inst.cb.setChecked(true);
        return;
      }
      _selected.delete(value);
    }

    // Update select-all state
    if (selectAllCb) {
      const activeOpts = options.filter((o) => !o.disabled);
      selectAllCb.setChecked(_selected.size === activeOpts.length);
      selectAllCb.setIndeterminate(_selected.size > 0 && _selected.size < activeOpts.length);
    }

    fireChange();
  }

  function fireChange(): void {
    const selectedOpts = options.filter((o) => _selected.has(o.value));
    onChange?.([..._selected], selectedOpts);
  }

  // --- Instance ---

  const instance: CheckboxGroupInstance = {
    el: root,

    getValues() { return [..._selected]; },

    setValues(values: string[]) {
      _selected = new Set(values);
      for (const [val, { cb }] of instances) {
        cb.setChecked(_selected.has(val));
      }
      if (selectAllCb) {
        const activeOpts = options.filter((o) => !o.disabled);
        selectAllCb.setChecked(_selected.size === activeOpts.length);
        selectAllCb.setIndeterminate(_selected.size > 0 && _selected.size < activeOpts.length);
      }
      fireChange();
    },

    selectAll() {
      for (const opt of options) {
        if (!opt.disabled) _selected.add(opt.value);
      }
      for (const [val, { cb }] of instances) {
        cb.setChecked(_selected.has(val));
      }
      if (selectAllCb) {
        selectAllCb.setChecked(true);
        selectAllCb.setIndeterminate(false);
      }
      fireChange();
    },

    deselectAll() {
      _selected.clear();
      for (const [, { cb }] of instances) {
        cb.setChecked(false);
      }
      if (selectAllCb) {
        selectAllCb.setChecked(false);
        selectAllCb.setIndeterminate(false);
      }
      fireChange();
    },

    isSelected(value: string) { return _selected.has(value); },
    getSelectedCount() { return _selected.size; },

    setOptionDisabled(value: string, d: boolean) {
      const entry = instances.get(value);
      if (entry) entry.cb.setDisabled(d);
    },

    addOption(option: CheckboxOption) {
      options.push(option);
      const cb = createCheckbox({
        label: option.label,
        checked: _selected.has(option.value),
        disabled: option.disabled || disabled,
        size,
        variant,
        value: option.value,
        onChange: (checked) => handleOptionChange(option.value, checked),
      });
      instances.set(option.value, { cb, opt: option });
      root.appendChild(cb.el);
    },

    removeOption(value: string) {
      const idx = options.findIndex((o) => o.value === value);
      if (idx >= 0) options.splice(idx, 1);
      const entry = instances.get(value);
      if (entry) {
        entry.cb.destroy();
        instances.delete(value);
      }
      _selected.delete(value);
    },

    validate() {
      if (minSelect !== undefined && _selected.size < minSelect) {
        return { valid: false, message: `Select at least ${minSelect} option(s)` };
      }
      if (maxSelect !== undefined && _selected.size > maxSelect) {
        return { valid: false, message: `Select at most ${maxSelect} option(s)` };
      }
      return { valid: true };
    },

    setDisabled(d: boolean) {
      disabled = d;
      for (const [, { cb }] of instances) cb.setDisabled(d);
      if (selectAllCb) selectAllCb.setDisabled(d);
    },

    destroy() { root.remove(); },
  };

  if (container) container.appendChild(root);

  return instance;
}
