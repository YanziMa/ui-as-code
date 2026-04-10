/**
 * Form Builder: Dynamic form creation with validation, field groups, error display,
 * async submission, field dependencies, conditional fields, and accessibility.
 */

// --- Types ---

export type FieldType = "text" | "email" | "password" | "number" | "tel" | "url" | "textarea" | "select" | "checkbox" | "radio" | "file" | "hidden" | "date" | "range";

export interface ValidationRule {
  /** Rule name (required, min, max, pattern, email, custom) */
  type: "required" | "min" | "max" | "pattern" | "email" | "custom";
  /** Value for min/max/pattern */
  value?: number | string | RegExp;
  /** Error message */
  message?: string;
  /** Custom validator function */
  validator?: (value: string, allValues: Record<string, string>) => string | null;
}

export interface FormField {
  /** Unique field key */
  name: string;
  /** Field label */
  label: string;
  /** Field type */
  type: FieldType;
  /** Placeholder text */
  placeholder?: string;
  /** Default value */
  defaultValue?: string | number | boolean | string[];
  /** Options for select/radio/checkbox */
  options?: Array<{ label: string; value: string }>;
  /** Validation rules */
  rules?: ValidationRule[];
  /** Description/hint text */
  description?: string;
  /** Disabled? */
  disabled?: boolean;
  /** Required? (shorthand for required rule) */
  required?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Rows for textarea */
  rows?: number;
  /** Min/max for number/range */
  min?: number;
  max?: number;
  /** Step for number/range */
  step?: number;
  /** Accept attribute for file input */
  accept?: string;
  /** Whether field depends on another field's value */
  showWhen?: (values: Record<string, string>) => boolean;
  /** Custom renderer */
  render?: (field: FormField, value: unknown, el: HTMLElement) => void;
}

export interface FormGroup {
  label?: string;
  fields: FormField[];
  /** Collapsible? */
  collapsible?: boolean;
  /** Default collapsed? */
  defaultCollapsed?: boolean;
}

export interface FormOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Form groups (or flat fields if no groups) */
  groups: FormGroup[] | FormField[];
  /** Submit button label */
  submitLabel?: string;
  /** Reset button label? */
  resetLabel?: string;
  /** Show submit button? */
  showSubmit?: boolean;
  /** Show reset button? */
  showReset?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Callback on valid submit */
  onSubmit?: (values: Record<string, string>) => void | Promise<void>;
  /** Callback on validation failure */
  onInvalid?: (errors: Record<string, string>) => void;
  /** Callback on field change */
  onChange?: (name: string, value: string) => void;
  /** Callback after reset */
  onReset?: () => void;
  /** Custom CSS class */
  className?: string;
  /** Horizontal layout? */
  horizontal?: boolean;
}

export interface FormInstance {
  element: HTMLFormElement;
  /** Get all current values */
  getValues: () => Record<string, string>;
  /** Set values programmatically */
  setValues: (values: Record<string, string>) => void;
  /** Validate all fields */
  validate: () => { valid: boolean; errors: Record<string, string> };
  /** Validate a single field */
  validateField: (name: string) => string | null;
  /** Reset form */
  reset: () => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Enable/disable form */
  setDisabled: (disabled: boolean) => void;
  /** Destroy cleanup */
  destroy: () => void;
}

// --- Validators ---

const validators: Record<string, (value: string, rule: ValidationRule) => string | null> = {
  required: (v) => (!v || v.trim() === "" ? (rule.message ?? "This field is required") : null),
  min: (v) => {
    const num = parseFloat(v);
    return isNaN(num) ? "Must be a number" : num < (rule.value as number) ? (rule.message ?? `Minimum value is ${rule.value}`) : null;
  },
  max: (v) => {
    const num = parseFloat(v);
    return isNaN(num) ? "Must be a number" : num > (rule.value as number) ? (rule.message ?? `Maximum value is ${rule.value}`) : null;
  },
  pattern: (v) => (rule.value as RegExp).test(v) ? null : (rule.message ?? "Invalid format"),
  email: (v) => /^[^\s\S]+@[\w.-]+\.[\w.]+$/.test(v) ? null : (rule.message ?? "Invalid email address"),
  custom: (v, _all, rule) => rule.validator?.(v) ?? null,
};

// --- Main ---

export function createForm(options: FormOptions): FormInstance {
  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Form: container not found");

  // Flatten groups into field list
  const allFields: FormField[] = [];
  const groupInfo: Array<{ startIdx: number; endIdx: number; label?: string; collapsible?: boolean }> = [];

  const rawGroups = options.groups as any[];
  let isGrouped = false;

  if (rawGroups.length > 0 && "fields" in rawGroups[0]) {
    isGrouped = true;
    for (let gi = 0; gi < rawGroups.length; gi++) {
      const g = rawGroups[gi] as FormGroup;
      const startIdx = allFields.length;
      for (const f of g.fields) allFields.push(f);
      groupInfo.push({ startIdx, endIdx: allFields.length - 1, label: g.label, collapsible: g.collapsible, defaultCollapsed: g.defaultCollapsed });
    }
  } else {
    for (const f of (options.groups as FormField[])) allFields.push(f);
  }

  // Create form element
  const form = document.createElement("form");
  form.className = `dynamic-form ${options.className ?? ""}`;
  form.setAttribute("novalidate", "");
  form.style.cssText = `
    font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
    ${options.horizontal ? "display:flex;flex-wrap:wrap;gap:16px;" : "display:flex;flex-direction:column;gap:16px;"}
  `;
  container.appendChild(form);

  const fieldElements = new Map<string, HTMLElement>();
  const errorElements = new Map<string, HTMLElement>();
  let destroyed = false;

  function build(): void {
    form.innerHTML = "";

    let fieldIdx = 0;
    const groupCount = groupInfo.length;

    for (let gi = 0; gi < groupCount || (isGrouped ? gi < groupCount : fieldIdx < allFields.length); gi++) {
      if (isGrouped && gi < groupCount) {
        const g = groupInfo[gi]!;
        const groupEl = document.createElement("fieldset");
        groupEl.style.cssText = `
          border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:0;
          legend:${g.label ? `padding:0 8px;font-weight:600;color:#374151;font-size:13px;` : "display:none;"}
        `;
        form.appendChild(groupEl);

        for (let fi = g.startIdx; fi <= g.endIdx; fi++) {
          const fieldEl = createField(allFields[fi]!, groupEl);
          groupEl.appendChild(fieldEl);
        }
      } else {
        const field = allFields[fieldIdx];
        if (!field) break;
        const fieldEl = createField(field, form);
        form.appendChild(fieldEl);
      }

      if (!isGrouped) fieldIdx++;
    }

    // Buttons row
    const btnRow = document.createElement("div");
    btnRow.style.cssText = `display:flex;gap:8px;justify-content:${options.horizontal ? "flex-start" : "flex-end"};margin-top:8px;`;

    if (options.showReset !== false && options.resetLabel !== "") {
      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.textContent = options.resetLabel ?? "Reset";
      resetBtn.style.cssText = `
        padding:8px 20px;border:1px solid #d1d5db;border-radius:6px;background:#fff;
        color:#374151;cursor:pointer;font-size:13px;font-weight:500;
        transition:background 0.15s;
      `;
      resetBtn.addEventListener("click", () => instance.reset());
      btnRow.appendChild(resetBtn);
    }

    if (options.showSubmit !== false) {
      const submitBtn = document.createElement("button");
      submitBtn.type = "submit";
      submitBtn.textContent = options.submitLabel ?? "Submit";
      submitBtn.style.cssText = `
        padding:8px 24px;border:none;border-radius:6px;background:#4f46e5;color:#fff;
        cursor:pointer;font-size:13px;font-weight:500;transition:background 0.15s;
        display:inline-flex;align-items:center;gap:6px;
      `;
      if (options.loading) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.7";
      }
      btnRow.appendChild(submitBtn);
    }

    if (btnRow.children.length > 0) form.appendChild(btnRow);
  }

  function createField(field: FormField, parent: HTMLElement): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = `form-field ff-${field.type} ${field.className ?? ""}`;
    wrapper.dataset.name = field.name;
    wrapper.style.cssText = `display:flex;flex-direction:column;gap:4px;${options.horizontal ? "min-width:200px;flex:1;" : ""}`;

    // Label
    const label = document.createElement("label");
    label.htmlFor = field.name;
    label.textContent = field.label + (field.required ? " *" : "");
    label.style.cssText = "font-size:13px;font-weight:500;color:#374151;";
    wrapper.appendChild(label);

    // Description
    if (field.description) {
      const desc = document.createElement("span");
      desc.style.cssText = "font-size:11px;color:#9ca3af;";
      desc.textContent = field.description;
      wrapper.appendChild(desc);
    }

    // Input element
    let input: HTMLElement;

    switch (field.type) {
      case "textarea": {
        const ta = document.createElement("textarea");
        ta.name = field.name;
        ta.placeholder = field.placeholder ?? "";
        ta.rows = field.rows ?? 3;
        ta.value = String(field.defaultValue ?? "");
        ta.disabled = field.disabled ?? false;
        ta.style.cssText = `
          padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;
          font-size:13px;font-family:inherit;resize:vertical;
          outline:none;transition:border-color 0.2s;
        `;
        input = ta;
        break;
      }
      case "select": {
        const sel = document.createElement("select");
        sel.name = field.name;
        sel.disabled = field.disabled ?? false;
        sel.style.cssText = `
          padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;
          font-size:13px;background:#fff;outline:none;
        `;
        if (field.options) {
          for (const opt of field.options) {
            const o = document.createElement("option");
            o.value = opt.value;
            o.textContent = opt.label;
            sel.appendChild(o);
          }
        }
        input = sel;
        break;
      }
      case "checkbox":
      case "radio": {
        const cbContainer = document.createElement("div");
        cbContainer.style.cssText = "display:flex;align-items:center;gap:6px;";

        if (field.options) {
          for (const opt of field.options) {
            const id = `${field.name}_${opt.value}`;
            const inp = document.createElement("input");
            inp.type = field.type;
            inp.name = field.name;
            inp.id = id;
            inp.value = opt.value;
            inp.checked = Array.isArray(field.defaultValue)
              ? field.defaultValue.includes(opt.value)
              : String(field.defaultValue ?? "") === String(opt.value);
            inp.disabled = field.disabled ?? false;

            const lbl = document.createElement("label");
            lbl.htmlFor = id;
            lbl.textContent = opt.label;
            lbl.style.cursor = "pointer";

            cbContainer.appendChild(inp);
            cbContainer.appendChild(lbl);
          }
        }
        input = cbContainer as unknown as HTMLElement;
        break;
      case "file": {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.name = field.name;
        fileInput.accept = field.accept ?? "";
        fileInput.disabled = field.disabled ?? false;
        fileInput.style.cssText = "font-size:13px;";
        input = fileInput;
        break;
      default: {
        const inp = document.createElement("input");
        inp.type = field.type;
        inp.name = field.name;
        inp.placeholder = field.placeholder ?? "";
        inp.value = String(field.defaultValue ?? "");
        inp.disabled = field.disabled ?? false;
        inp.min = field.min !== undefined ? String(field.min) : undefined;
        inp.max = field.max !== undefined ? String(field.max) : undefined;
        inp.step = field.step !== undefined ? String(field.step) : undefined;
        inp.style.cssText = `
          padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;
          font-size:13px;outline:none;transition:border-color 0.2s;
          box-shadow:inset 0 1px 3px rgba(0,0,0,0);
        `;
        input = inp;
        break;
      }

    // Error container
    const errorEl = document.createElement("div");
    errorEl.className = "form-error";
    errorEl.style.cssText = "font-size:12px;color:#dc2626;display:none;margin-top:2px;";
    wrapper.appendChild(input instanceof Element ? input : document.createElement("span"));
    wrapper.appendChild(errorEl);

    fieldElements.set(field.name, input as HTMLElement);
    errorElements.set(field.name, errorEl);

    // Focus/blur events for validation
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
      input.addEventListener("blur", () => {
        const err = instance.validateField(field.name);
        showError(field.name, err);
      });
      input.addEventListener("input", () => {
        options.onChange?.(field.name, (input as HTMLInputElement).value);
      });
    }

    // Custom renderer
    if (field.render) field.render(field, field.defaultValue, wrapper);

    wrapper.appendChild(errorEl);
    parent.appendChild(wrapper);
    return wrapper;
  }

  function showError(name: string, error: string | null): void {
    const el = errorElements.get(name);
    if (el) {
      if (error) {
        el.textContent = error;
        el.style.display = "block";
      } else {
        el.style.display = "none";
      }
    }
  }

  // Submit handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const values: Record<string, string> = {};
    const errors: Record<string, string> = {};

    for (const field of allFields) {
      const el = fieldElements.get(field.name);
      if (!el) continue;

      let value: string;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        value = el.value;
      } else if (el instanceof HTMLDivElement) {
        // Checkbox/radio group
        const checked = (el as HTMLDivElement).querySelectorAll<HTMLInputElement>("input:checked");
        value = checked.map((c) => c.value).join(",");
      } else {
        value = "";
      }

      values[field.name] = value;

      // Validate
      const err = instance.validateField(field.name);
      if (err) errors[field.name] = err;
      showError(field.name, err);
    }

    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors) {
      options.onInvalid?.(errors);
      return;
    }

    // Call submit handler
    try {
      await options.onSubmit?.(values);
    } catch (err) {
      console.error("Form submit error:", err);
    }
  });

  // Instance
  const instance: FormInstance = {
    element: form,

    getValues() {
      const vals: Record<string, string> = {};
      for (const field of allFields) {
        const el = fieldElements.get(field.name);
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
          vals[field.name] = el.value;
        } else if (el instanceof HTMLDivElement) {
          const checked = el.querySelectorAll<HTMLInputElement>("input:checked");
          vals[field.name] = checked.map((c) => c.value).join(",");
        }
      }
      return vals;
    },

    setValues(newVals: Record<string, string>) {
      for (const [key, val] of Object.entries(newVals)) {
        const el = fieldElements.get(key);
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
          el.value = val;
        }
      }
    },

    validate() {
      const errs: Record<string, string> = {};
      for (const field of allFields) {
        const err = instance.validateField(field.name);
        if (err) errs[field.name] = err;
        showError(field.name, err);
      }
      return { valid: Object.keys(errs).length === 0, errors: errs };
    },

    validateField(name: string): string | null {
      const field = allFields.find((f) => f.name === name);
      if (!field) return null;
      const el = fieldElements.get(name);
      const value = el instanceof HTMLInputElement ? el.value
        : el instanceof HTMLTextAreaElement ? el.value
        : el instanceof HTMLSelectElement ? el.value
        : "";

      const rules = field.rules ?? [];
      if (field.required && !rules.find((r) => r.type === "required")) {
        rules.unshift({ type: "required", message: `${field.label} is required` });
      }

      for (const rule of rules) {
        const validatorFn = validators[rule.type];
        if (validatorFn) {
          const err = validatorFn(value, rule);
          if (err) return err;
        }
      }
      return null;
    },

    reset() {
      form.reset();
      for (const field of allFields) {
        showError(field.name, null);
      }
      options.onReset?.();
    },

    setLoading(loading: boolean) {
      const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (btn) {
        btn.disabled = loading;
        btn.style.opacity = loading ? "0.7" : "";
      }
    },

    setDisabled(disabled: boolean) {
      const inputs = form.querySelectorAll("input, select, textarea, button");
      inputs.forEach((el) => { el.disabled = disabled; });
    },

    destroy() {
      destroyed = true;
      form.remove();
    },
  };

  build();
  return instance;
}
