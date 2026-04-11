/**
 * Form Utilities: Form state management, field validation, error display,
 * form serialization, dirty tracking, multi-step forms, conditional fields,
 * auto-save, and accessibility helpers.
 */

// --- Types ---

export interface FormFieldConfig {
  /** Field name */
  name: string;
  /** Current value */
  value: unknown;
  /** Initial value (for dirty detection) */
  initialValue?: unknown;
  /** Whether the field is required */
  required?: boolean;
  /** Validation rules */
  rules?: FormValidationRule[];
  /** Custom error message */
  errorMessage?: string;
  /** Label text */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is read-only */
  readOnly?: boolean;
  /** Field type hint */
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "textarea" | "select" | "checkbox" | "radio" | "file" | "date" | "color" | "range";
  /** Options for select/radio/checkbox groups */
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  /** Min/max values (for number/range/date) */
  min?: number | string;
  max?: number | string;
  /** Minimum length (for text) */
  minLength?: number;
  /** Maximum length (for text) */
  maxLength?: number;
  /** Pattern (regex string) */
  pattern?: string;
  /** Custom validator function */
  customValidator?: (value: unknown, allValues: Record<string, unknown>) => string | null;
  /** Debounce validation delay (ms) */
  validateDebounce?: number;
  /** Show error on blur only? */
  validateOnBlur?: boolean;
}

export interface FormValidationRule {
  type: "required" | "minLength" | "maxLength" | "min" | "max" | "pattern" | "email" | "url" | "custom";
  value?: number | string | RegExp | ((value: unknown) => string | null);
  message: string;
}

export interface FormFieldState {
  value: unknown;
  touched: boolean;
  dirty: boolean;
  valid: boolean;
  errors: string[];
  focused: boolean;
  validating: boolean;
}

export interface FormOptions {
  /** Initial field configurations */
  fields: FormFieldConfig[];
  /** Validate on every change? (default: false, validates on blur + submit) */
  validateOnChange?: boolean;
  /** Callback when any field changes */
  onChange?: (values: Record<string, unknown>, fieldStates: Record<string, FormFieldState>) => void;
  /** Callback when form becomes valid/invalid */
  onValidityChange?: (isValid: boolean) => void;
  /** Callback when form dirty state changes */
  onDirtyChange?: (isDirty: boolean) => void;
  /** Auto-save interval in ms (0 = disabled) */
  autoSaveInterval?: number;
  /** Auto-save callback */
  onAutoSave?: (values: Record<string, unknown>) => Promise<void> | void;
  /** Submit handler */
  onSubmit?: (values: Record<string, unknown>) => Promise<void> | void;
  /** Reset after successful submit? */
  resetOnSubmit?: boolean;
  /** Custom serializer */
  serialize?: (values: Record<string, unknown>) => Record<string, unknown>;
}

export interface FormInstance {
  /** Get current values */
  getValues(): Record<string, unknown>;
  /** Set a single field value */
  setValue(name: string, value: unknown): void;
  /** Set multiple values at once */
  setValues(values: Partial<Record<string, unknown>>): void;
  /** Get field state */
  getFieldState(name: string): FormFieldState | undefined;
  /** Get all field states */
  getAllFieldStates(): Record<string, FormFieldState>;
  /** Validate a single field */
  validateField(name: string): string[];
  /** Validate entire form */
  validate(): { valid: boolean; errors: Record<string, string[]> };
  /** Check if form is valid without triggering validation */
  isValid(): boolean;
  /** Check if form has unsaved changes */
  isDirty(): boolean;
  /** Get names of dirty fields */
  getDirtyFields(): string[];
  /** Touch a field (mark as interacted) */
  touch(name: string): void;
  /** Touch all fields */
  touchAll(): void;
  /** Focus a field by name */
  focusField(name: string): boolean;
  /** Focus first invalid field */
  focusFirstError(): boolean;
  /** Reset to initial values */
  reset(): void;
  /** Reset to specific values */
  resetTo(values: Record<string, unknown>): void;
  /** Submit the form (validates first) */
  submit(): Promise<boolean>;
  /** Register a new field dynamically */
  registerField(config: FormFieldConfig): void;
  /** Unregister a field */
  unregisterField(name: string): void;
  /** Enable/disable a field */
  setFieldDisabled(name: string, disabled: boolean): void;
  /** Subscribe to changes */
  subscribe(listener: () => void): () => void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Built-in Validators ---

const validators: Record<string, (value: unknown, ruleValue: unknown) => string | null> = {
  required: (value) =>
    value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)
      ? "This field is required"
      : null,
  minLength: (value, ruleValue) => {
    const str = String(value ?? "");
    return str.length < (ruleValue as number)
      ? `Must be at least ${ruleValue} characters`
      : null;
  },
  maxLength: (value, ruleValue) => {
    const str = String(value ?? "");
    return str.length > (ruleValue as number)
      ? `Must be no more than ${ruleValue} characters`
      : null;
  },
  min: (value, ruleValue) => {
    const num = Number(value);
    if (isNaN(num)) return null;
    return num < (ruleValue as number)
      ? `Must be at least ${ruleValue}`
      : null;
  },
  max: (value, ruleValue) => {
    const num = Number(value);
    if (isNaN(num)) return null;
    return num > (ruleValue as number)
      ? `Must be no more than ${ruleValue}`
      : null;
  },
  pattern: (value, ruleValue) => {
    const str = String(value ?? "");
    const regex = ruleValue instanceof RegExp ? ruleValue : new RegExp(String(ruleValue));
    return str.length > 0 && !regex.test(str)
      ? "Invalid format"
      : null;
  },
  email: (value) => {
    const str = String(value ?? "");
    if (!str) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)
      ? null
      : "Please enter a valid email address";
  },
  url: (value) => {
    const str = String(value ?? "");
    if (!str) return null;
    try { new URL(str); return null; }
    catch { return "Please enter a valid URL"; }
  },
};

// --- Main Form Manager ---

export function createForm(options: FormOptions): FormInstance {
  const {
    fields,
    validateOnChange = false,
    onChange,
    onValidityChange,
    onDirtyChange,
    autoSaveInterval = 0,
    onAutoSave,
    onSubmit,
    resetOnSubmit = true,
    serialize: customSerialize,
  } = options;

  // State
  const fieldConfigs = new Map<string, FormFieldConfig>();
  const fieldStates = new Map<string, FormFieldState>();
  const listeners = new Set<() => void>();
  let destroyed = false;
  let autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  // Initialize fields
  for (const config of fields) {
    registerFieldInternal(config);
  }

  function registerFieldInternal(config: FormFieldConfig): void {
    const initialVal = config.initialValue !== undefined ? config.initialValue : config.value;
    fieldConfigs.set(config.name, config);
    fieldStates.set(config.name, {
      value: initialVal,
      touched: false,
      dirty: false,
      valid: true,
      errors: [],
      focused: false,
      validating: false,
    });
  }

  function notify(): void {
    if (destroyed) return;
    for (const fn of listeners) { try { fn(); } catch {} }
    onChange?.(getValues(), getAllFieldStates());
    onDirtyChange?.(isDirty());
    onValidityChange?.(isValid());
  }

  function runValidation(name: string): string[] {
    const config = fieldConfigs.get(name);
    const state = fieldStates.get(name);
    if (!config || !state) return [];

    const errors: string[] = [];

    // Required check
    if (config.required) {
      const err = validators.required(state.value);
      if (err) errors.push(err);
    }

    // Rule-based validation
    if (config.rules) {
      for (const rule of config.rules) {
        const validator = validators[rule.type];
        if (validator) {
          const err = validator(state.value, rule.value);
          if (err) errors.push(rule.message || err);
        } else if (rule.type === "custom" && typeof rule.value === "function") {
          const err = rule.value(state.value);
          if (err) errors.push(err);
        }
      }
    }

    // Pattern from config
    if (config.pattern) {
      const err = validators.pattern(state.value, config.pattern);
      if (err) errors.push(err);
    }

    // Type-specific validation
    if (config.type === "email") {
      const err = validators.email(state.value);
      if (err) errors.push(err);
    } else if (config.type === "url") {
      const err = validators.url(state.value);
      if (err) errors.push(err);
    }

    // Length checks from config
    if (config.minLength !== undefined) {
      const err = validators.minLength(state.value, config.minLength);
      if (err) errors.push(err);
    }
    if (config.maxLength !== undefined) {
      const err = validators.maxLength(state.value, config.maxLength);
      if (err) errors.push(err);
    }

    // Custom validator
    if (config.customValidator) {
      const err = config.customValidator(state.value, getValues());
      if (err) errors.push(err);
    }

    // Config-level error message
    if (errors.length === 0 && config.errorMessage) {
      errors.push(config.errorMessage);
    }

    return errors;
  }

  function updateFieldState(name: string, updates: Partial<FormFieldState>): void {
    const state = fieldStates.get(name);
    if (!state) return;
    Object.assign(state, updates);

    // Track dirty
    const config = fieldConfigs.get(name);
    if (config) {
      state.dirty = JSON.stringify(state.value) !== JSON.stringify(
        config.initialValue !== undefined ? config.initialValue : config.value
      );
    }

    // Validate if change triggers it
    if (validateOnChange || updates.touched) {
      const errors = runValidation(name);
      state.valid = errors.length === 0;
      state.errors = errors;
    }

    notify();
  }

  // Auto-save setup
  if (autoSaveInterval > 0 && onAutoSave) {
    autoSaveTimer = setInterval(() => {
      if (isDirty() && !destroyed) {
        onAutoSave(getValues()).catch(() => {});
      }
    }, autoSaveInterval);
  }

  // Instance
  const instance: FormInstance = {
    getValues() {
      const values: Record<string, unknown> = {};
      for (const [name, state] of fieldStates) {
        values[name] = state.value;
      }
      return customSerialize ? customSerialize(values) : values;
    },

    setValue(name, value) {
      updateFieldState(name, { value });
    },

    setValues(values) {
      for (const [name, value] of Object.entries(values)) {
        if (fieldStates.has(name)) {
          updateFieldState(name, { value });
        }
      }
    },

    getFieldState(name) { return fieldStates.get(name); },

    getAllFieldStates() {
      const result: Record<string, FormFieldState> = {};
      for (const [name, state] of fieldStates) result[name] = { ...state };
      return result;
    },

    validateField(name) { return runValidation(name); },

    validate() {
      const errors: Record<string, string[]> = {};
      let valid = true;
      for (const name of fieldConfigs.keys()) {
        const errs = runValidation(name);
        if (errs.length > 0) {
          errors[name] = errs;
          valid = false;
          updateFieldState(name, { valid: false, errors: errs });
        } else {
          updateFieldState(name, { valid: true, errors: [] });
        }
      }
      return { valid, errors };
    },

    isValid() {
      for (const [, state] of fieldStates) {
        if (!state.valid) return false;
      }
      return true;
    },

    isDirty() {
      for (const [, state] of fieldStates) {
        if (state.dirty) return true;
      }
      return false;
    },

    getDirtyFields() {
      const dirty: string[] = [];
      for (const [name, state] of fieldStates) {
        if (state.dirty) dirty.push(name);
      }
      return dirty;
    },

    touch(name) { updateFieldState(name, { touched: true }); },
    touchAll() { for (const name of fieldConfigs.keys()) updateFieldState(name, { touched: true }); },

    focusField(name) {
      const el = document.querySelector(`[name="${name}"]`) as HTMLElement | null;
      if (el && typeof el.focus === "function") { el.focus(); return true; }
      return false;
    },

    focusFirstError() {
      for (const [name, state] of fieldStates) {
        if (!state.valid && state.touched) {
          return instance.focusField(name);
        }
      }
      // If nothing touched yet, find first invalid
      for (const name of fieldConfigs.keys()) {
        const errs = runValidation(name);
        if (errs.length > 0) {
          updateFieldState(name, { valid: false, errors: errs, touched: true });
          return instance.focusField(name);
        }
      }
      return false;
    },

    reset() {
      for (const [name, config] of fieldConfigs) {
        const initialVal = config.initialValue !== undefined ? config.initialValue : config.value;
        fieldStates.set(name, {
          value: initialVal,
          touched: false,
          dirty: false,
          valid: true,
          errors: [],
          focused: false,
          validating: false,
        });
      }
      notify();
    },

    resetTo(values) {
      for (const [name, value] of Object.entries(values)) {
        if (fieldStates.has(name)) {
          fieldStates.set(name, {
            value,
            touched: false,
            dirty: false,
            valid: true,
            errors: [],
            focused: false,
            validating: false,
          });
        }
      }
      notify();
    },

    async submit(): Promise<boolean> {
      const { valid, errors } = instance.validate();

      // Mark all invalid fields as touched
      for (const name of Object.keys(errors)) {
        updateFieldState(name, { touched: true });
      }

      if (!valid) {
        instance.focusFirstError();
        return false;
      }

      try {
        await onSubmit?.(instance.getValues());
        if (resetOnSubmit) instance.reset();
        return true;
      } catch {
        return false;
      }
    },

    registerField(config) { registerFieldInternal(config); notify(); },

    unregisterField(name) {
      fieldConfigs.delete(name);
      fieldStates.delete(name);
      notify();
    },

    setFieldDisabled(name, disabled) {
      const config = fieldConfigs.get(name);
      if (config) { config.disabled = disabled; notify(); }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    destroy() {
      destroyed = true;
      if (autoSaveTimer) clearInterval(autoSaveTimer);
      listeners.clear();
      fieldConfigs.clear();
      fieldStates.clear();
    },
  };

  return instance;
}

// --- HTML Form Helpers ---

/**
 * Serialize an HTML <form> element into key-value pairs.
 * Handles checkboxes, radio buttons, selects, and file inputs.
 */
export function serializeForm(formElement: HTMLFormElement): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const elements = formElement.elements;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLElement & { name?: string; value?: string; checked?: boolean; type?: string; files?: FileList };

    if (!el.name || el.disabled) continue;

    switch (el.type) {
      case "checkbox":
        data[el.name] = el.checked;
        break;
      case "radio":
        if (el.checked) data[el.name] = el.value;
        break;
      case "file":
        data[el.name] = el.files ? Array.from(el.files) : [];
        break;
      case "select-multiple": {
        const select = el as HTMLSelectElement;
        data[el.name] = Array.from(select.selectedOptions).map((o) => o.value);
        break;
      }
      default:
        if (!(el.name in data)) {
          data[el.name] = el.value ?? "";
        } else {
          // Convert to array for duplicate names
          const existing = data[el.name];
          if (Array.isArray(existing)) {
            existing.push(el.value ?? "");
          } else {
            data[el.name] = [existing, el.value ?? """];
          }
        }
    }
  }

  return data;
}

/**
 * Populate an HTML <form> element from key-value pairs.
 */
export function populateForm(formElement: HTMLFormElement, data: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(data)) {
    const elements = formElement.querySelectorAll(`[name="${key}"]`);
    if (elements.length === 0) continue;

    for (const el of elements) {
      const htmlEl = el as HTMLElement & { value?: string; checked?: boolean; type?: string };

      switch (htmlEl.type) {
        case "checkbox":
          htmlEl.checked = Boolean(value);
          break;
        case "radio":
          htmlEl.checked = htmlEl.value === String(value);
          break;
        default:
          htmlEl.value = String(value ?? "");
      }
    }
  }
}

/**
 * Clear all fields in a form.
 */
export function clearForm(formElement: HTMLFormElement): void {
  formElement.reset();
  // Also clear custom state
  const errorElements = formElement.querySelectorAll("[data-error]");
  for (const el of errorElements) el.textContent = "";
}

// --- Multi-step Form ---

export interface StepConfig {
  id: string;
  title?: string;
  description?: string;
  /** Fields belonging to this step */
  fieldNames: string[];
  /** Optional step-level validation */
  validate?: (values: Record<string, unknown>) => string | null;
  /** Whether this step can be skipped */
  skippable?: boolean;
  /** Conditional: show this step only if... */
  condition?: (values: Record<string, unknown>) => boolean;
}

export interface MultiStepFormOptions {
  steps: StepConfig[];
  /** Called when step changes */
  onStepChange?: (stepIndex: number, stepId: string) => void;
  /** Called when wizard completes with final values */
  onComplete?: (values: Record<string, unknown>) => void;
  /** Allow going back? */
  allowBack?: boolean;
  /** Confirm before leaving incomplete form? */
  confirmLeave?: boolean;
}

export interface MultiStepFormInstance {
  /** Current step index (0-based) */
  currentStep: number;
  /** Total steps */
  totalSteps: number;
  /** Go to next step */
  next(): boolean;
  /** Go to previous step */
  prev(): boolean;
  /** Jump to specific step */
  goTo(index: number): boolean;
  /** Get aggregated values from all completed steps */
  getValues(): Record<string, unknown>;
  /** Set values */
  setValues(values: Record<string, unknown>): void;
  /** Is the given step accessible? */
  canAccess(index: number): boolean;
  /** Complete the wizard */
  complete(): boolean;
  /** Reset everything */
  reset(): void;
}

export function createMultiStepForm(options: MultiStepFormOptions): MultiStepFormInstance {
  let currentStep = 0;
  const stepValues: Record<string, unknown> = {};

  const instance: MultiStepFormInstance = {
    get currentStep() { return currentStep; },
    get totalSteps() { return options.steps.length; },

    next() {
      if (currentStep >= options.steps.length - 1) return false;
      const step = options.steps[currentStep];

      // Run step validation
      if (step.validate) {
        const err = step.validate(stepValues);
        if (err) return false;
      }

      currentStep++;
      options.onStepChange?.(currentStep, options.steps[currentStep]?.id ?? "");
      return true;
    },

    prev() {
      if (!options.allowBack || currentStep <= 0) return false;
      currentStep--;
      options.onStepChange?.(currentStep, options.steps[currentStep]?.id ?? "");
      return true;
    },

    goTo(index) {
      if (index < 0 || index >= options.steps.length) return false;
      // Can only go to visited steps or next unvisited step
      if (index > currentStep + 1) return false;
      currentStep = index;
      options.onStepChange?.(currentStep, options.steps[currentStep]?.id ?? "");
      return true;
    },

    getValues() { return { ...stepValues }; },

    setValues(values) { Object.assign(stepValues, values); },

    canAccess(index) {
      if (index < 0 || index >= options.steps.length) return false;
      // Can access current and previous steps
      return index <= currentStep;
    },

    complete() {
      // Final validation
      for (let i = 0; i < options.steps.length; i++) {
        const step = options.steps[i];
        if (step.validate) {
          const err = step.validate(stepValues);
          if (err) {
            currentStep = i;
            options.onStepChange?.(i, step.id);
            return false;
          }
        }
      }
      options.onComplete?.(stepValues);
      return true;
    },

    reset() {
      currentStep = 0;
      for (const key of Object.keys(stepValues)) delete stepValues[key];
      options.onStepChange?.(0, options.steps[0]?.id ?? "");
    },
  };

  return instance;
}

// --- Conditional Field Logic ---

export interface ConditionRule {
  /** Target field name that controls visibility/enabled */
  field: string;
  /** Operator */
  operator: "equals" | "notEquals" | "contains" | "notContains" | "isEmpty" | "isNotEmpty" | "greaterThan" | "lessThan" | "in" | "notIn";
  /** Comparison value */
  value?: unknown;
}

export interface ConditionalField {
  /** This field's name */
  name: string;
  /** Rules - ALL must match (AND logic) */
  rules: ConditionRule[];
  /** Action when conditions met */
  action: "show" | "hide" | "enable" | "disable" | "require" | "optional";
}

/**
 * Evaluate conditional field visibility/state based on current form values.
 */
export function evaluateConditionals(
  conditionals: ConditionalField[],
  values: Record<string, unknown>,
): Record<string, { visible: boolean; enabled: boolean; required: boolean }> {
  const results: Record<string, { visible: boolean; enabled: boolean; required: boolean }> = {};

  for (const cf of conditionals) {
    const allMatch = cf.rules.every((rule) => matchRule(rule, values));

    results[cf.name] = {
      visible: cf.action === "show" ? allMatch : cf.action === "hide" ? !allMatch : true,
      enabled: cf.action === "enable" ? allMatch : cf.action === "disable" ? !allMatch : true,
      required: cf.action === "require" ? allMatch : cf.action === "optional" ? !allMatch : false,
    };
  }

  return results;
}

function matchRule(rule: ConditionRule, values: Record<string, unknown>): boolean {
  const fieldValue = values[rule.field];

  switch (rule.operator) {
    case "equals": return fieldValue == rule.value;
    case "notEquals": return fieldValue != rule.value;
    case "contains": return String(fieldValue ?? "").includes(String(rule.value ?? ""));
    case "notContains": return !String(fieldValue ?? "").includes(String(rule.value ?? ""));
    case "isEmpty": return fieldValue === undefined || fieldValue === null || fieldValue === "";
    case "isNotEmpty": return fieldValue !== undefined && fieldValue !== null && fieldValue !== "";
    case "greaterThan": return Number(fieldValue) > Number(rule.value ?? 0);
    case "lessThan": return Number(fieldValue) < Number(rule.value ?? 0);
    case "in": return Array.isArray(rule.value) && rule.value.includes(fieldValue);
    case "notIn": return !Array.isArray(rule.value) || !rule.value.includes(fieldValue);
    default: return false;
  }
}

// --- Accessibility Helpers ---

/**
 * Associate an error message element with a form field using ARIA attributes.
 */
export function linkErrorToField(
  inputEl: HTMLElement,
  errorEl: HTMLElement,
  message?: string,
): void {
  const errorId = `error-${inputEl.id || inputEl.getAttribute("name") || Math.random().toString(36).slice(2)}`;
  errorEl.id = errorId;
  inputEl.setAttribute("aria-describedby", errorId);
  inputEl.setAttribute("aria-invalid", "true");
  if (message !== undefined) errorEl.textContent = message;
}

/**
 * Remove error association from a form field.
 */
export function unlinkErrorFromField(inputEl: HTMLElement): void {
  inputEl.removeAttribute("aria-describedby");
  inputEl.setAttribute("aria-invalid", "false");
}

/**
 * Setup live region announcements for form validation feedback.
 */
export function createFormAnnouncer(): { announce(message: string, priority?: "polite" | "assertive"): void; destroy: () => void } {
  const polite = document.createElement("div");
  polite.setAttribute("role", "status");
  polite.setAttribute("aria-live", "polite");
  polite.className = "sr-only";
  polite.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);";

  const assertive = document.createElement("div");
  assertive.setAttribute("role", "alert");
  assertive.setAttribute("aria-live", "assertive");
  assertive.className = "sr-only";
  assertive.style.cssText = polite.style.cssText;

  document.body.appendChild(polite);
  document.body.appendChild(assertive);

  return {
    announce(message, priority = "polite") {
      const el = priority === "assertive" ? assertive : polite;
      el.textContent = "";
      requestAnimationFrame(() => { el.textContent = message; });
    },
    destroy() {
      polite.remove();
      assertive.remove();
    },
  };
}
