/**
 * Form Validation Engine: Declarative rules, async validators, real-time feedback,
 * error message display, field-level and form-level validation, custom rule creation,
 * cross-field validation, and accessibility support.
 */

// --- Types ---

export interface ValidationRule {
  /** Rule name/identifier */
  name: string;
  /** Validate function — returns error message string or null if valid */
  validate: (value: unknown, context: ValidationContext) => string | Promise<string | null>;
  /** When to trigger: 'change', 'blur', 'submit', or array */
  trigger?: "change" | "blur" | "submit" | ("change" | "blur" | "submit")[];
  /** Priority for ordering multiple errors */
  priority?: number;
  /** Whether this rule runs asynchronously */
  async?: boolean;
}

export interface ValidationContext {
  /** All form values */
  values: Record<string, unknown>;
  /** The field being validated */
  fieldName: string;
  /** Full form element reference */
  form: HTMLFormElement;
}

export interface FieldConfig {
  /** Field name (must match input name attribute) */
  name: string;
  /** Input element or selector */
  element: HTMLElement | string;
  /** Validation rules for this field */
  rules: ValidationRule[];
  /** Custom error message container (auto-created if not provided) */
  errorContainer?: HTMLElement;
  /** Show error inline below the field */
  showErrorInline?: boolean;
  /** Custom error renderer */
  renderError?: (message: string, container: HTMLElement) => void;
  /** Clear error renderer */
  clearError?: (container: HTMLElement) => void;
  /** Debounce delay for 'change' triggers (ms) */
  debounceMs?: number;
  /** Label text for accessibility */
  label?: string;
}

export interface FormValidationOptions {
  /** Form element or selector */
  form: HTMLFormElement | string;
  /** Field configurations */
  fields: FieldConfig[];
  /** Validate on submit automatically */
  validateOnSubmit?: boolean;
  /** Show summary of all errors at top */
  showSummary?: boolean;
  /** Summary container element or selector */
  summaryContainer?: HTMLElement | string;
  /** Callback when form becomes valid */
  onValid?: () => void;
  /** Callback when form has errors */
  onInvalid?: (errors: ValidationError[]) => void;
  /** Callback per-field validation */
  onFieldValidate?: (fieldName: string, isValid: boolean, errors: string[]) => void;
  /** Scroll to first error on submit */
  scrollToError?: boolean;
  /** Custom CSS class for error state */
  errorClass?: string;
  /** Custom CSS class for valid state */
  validClass?: string;
}

export interface ValidationError {
  fieldName: string;
  ruleName: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  fieldErrors: Record<string, string[]>;
}

export interface FormValidatorInstance {
  /** The form element */
  formEl: HTMLFormElement;
  /** Validate all fields */
  validate: () => Promise<ValidationResult>;
  /** Validate a single field */
  validateField: (name: string) => Promise<string[]>;
  /** Get current validation state */
  getState: () => ValidationResult;
  /** Manually set field error */
  setFieldError: (name: string, message: string) => void;
  /** Clear field error(s) */
  clearFieldError: (name: string) => void;
  /** Clear all errors */
  clearErrors: () => void;
  /** Reset entire form validation state */
  reset: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Built-in Rules ---

export const BuiltInRules: Record<string, ValidationRule> = {
  required: {
    name: "required",
    validate: (value) => {
      if (value === null || value === undefined) return "This field is required";
      if (typeof value === "string" && !value.trim()) return "This field is required";
      if (Array.isArray(value) && value.length === 0) return "This field is required";
      return null;
    },
    trigger: "blur",
    priority: 100,
  },

  email: {
    name: "email",
    validate: (value) => {
      if (!value) return null; // Use 'required' rule for empty check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(String(value)) ? null : "Please enter a valid email address";
    },
    trigger: "blur",
    priority: 50,
  },

  minLength: ((min: number) => ({
    name: "minLength",
    validate: (value) => {
      if (!value) return null;
      return String(value).length >= min
        ? null
        : `Must be at least ${min} characters`;
    },
    trigger: "blur",
    priority: 40,
  })) as unknown as ValidationRule,

  maxLength: ((max: number) => ({
    name: "maxLength",
    validate: (value) => {
      if (!value) return null;
      return String(value).length <= max
        ? null
        : `Must be no more than ${max} characters`;
    },
    trigger: "blur",
    priority: 40,
  })) as unknown as ValidationRule,

  min: ((min: number) => ({
    name: "min",
    validate: (value) => {
      if (value === "" || value == null) return null;
      const num = Number(value);
      return isNaN(num) || num >= min ? null : `Must be at least ${min}`;
    },
    trigger: "blur",
    priority: 40,
  })) as unknown as ValidationRule,

  max: ((max: number) => ({
    name: "max",
    validate: (value) => {
      if (value === "" || value == null) return null;
      const num = Number(value);
      return isNaN(num) || num <= max ? null : `Must be no more than ${max}`;
    },
    trigger: "blur",
    priority: 40,
  })) as unknown as ValidationRule,

  pattern: ((regex: RegExp, msg: string) => ({
    name: "pattern",
    validate: (value) => {
      if (!value) return null;
      return regex.test(String(value)) ? null : (msg || "Format is invalid");
    },
    trigger: "blur",
    priority: 30,
  })) as unknown as ValidationRule,

  match: ((matchFieldName: string, label?: string) => ({
    name: "match",
    validate: (_value, ctx) => {
      const val = String(_value ?? "");
      const matchVal = String(ctx.values[matchFieldName] ?? "");
      return val === matchVal ? null : `Must match ${label ?? matchFieldName}`;
    },
    trigger: "blur",
    priority: 35,
  })) as unknown as ValidationRule,

  url: {
    name: "url",
    validate: (value) => {
      if (!value) return null;
      try {
        new URL(String(value));
        return null;
      } catch {
        return "Please enter a valid URL";
      }
    },
    trigger: "blur",
    priority: 50,
  },

  custom: ((fn: (value: unknown, ctx: ValidationContext) => string | null, name = "custom") => ({
    name,
    validate: fn,
    trigger: "blur",
    priority: 20,
  })) as unknown as ValidationRule,
};

// --- Helper Functions ---

function resolveElement(el: HTMLElement | string): HTMLElement | null {
  return typeof el === "string" ? document.querySelector(el) : el;
}

function getDefaultErrorRenderer(errorClass: string): (msg: string, container: HTMLElement) => void {
  return (msg, container) => {
    container.textContent = msg;
    container.style.cssText = `
      color:#dc2626;font-size:12px;margin-top:4px;display:block;
      animation:shake 0.3s ease;
    `;
  };
}

function getDefaultClearError(): (container: HTMLElement) => void {
  return (container) => {
    container.textContent = "";
    container.style.cssText = "display:none;";
  };
}

// --- Main Class ---

export class FormValidator {
  create(options: FormValidationOptions): FormValidatorInstance {
    const opts = {
      validateOnSubmit: options.validateOnSubmit ?? true,
      showSummary: options.showSummary ?? false,
      scrollToError: options.scrollToError ?? true,
      errorClass: options.errorClass ?? "field-error",
      validClass: options.validClass ?? "field-valid",
      ...options,
    };

    const formEl = typeof options.form === "string"
      ? document.querySelector<HTMLFormElement>(options.form)!
      : options.form;

    if (!formEl) throw new Error("FormValidator: form element not found");

    // Resolve field elements
    const fieldMap = new Map<string, FieldConfig>();
    const errorContainers = new Map<string, HTMLElement>();
    const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
    let destroyed = false;

    // Current state
    let currentState: ValidationResult = {
      isValid: true,
      errors: [],
      fieldErrors: {},
    };

    // Setup each field
    for (const field of options.fields) {
      const el = resolveElement(field.element);
      if (!el) continue;

      fieldMap.set(field.name, field);

      // Create error container
      let errContainer = field.errorContainer;
      if (!errContainer && field.showErrorInline !== false) {
        errContainer = document.createElement("div");
        errContainer.className = `${opts.errorClass}-message`;
        errContainer.setAttribute("role", "alert");
        errContainer.style.cssText = "display:none;";
        el.parentNode?.insertAfter(errContainer, el);
      }
      if (errContainer) {
        errorContainers.set(field.name, errContainer);
      }

      const renderErr = field.renderError ?? getDefaultErrorRenderer(opts.errorClass);
      const clearErr = field.clearError ?? getDefaultClearError();

      // Bind events
      const inputEl = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
        ? el
        : el.querySelector<HTMLInputElement>();

      if (inputEl) {
        // Change event
        inputEl.addEventListener("input", () => {
          scheduleValidation(field.name, "change");
        });

        // Blur event
        inputEl.addEventListener("blur", () => {
          validateFieldInternal(field.name, "blur");
        });
      }
    }

    function scheduleValidation(fieldName: string, trigger: "change" | "blur"): void {
      const field = fieldMap.get(fieldName);
      if (!field) return;

      const debounceMs = field.debounceMs ?? 300;
      const prevTimer = debounceTimers.get(fieldName);
      if (prevTimer) clearTimeout(prevTimer);

      const timer = setTimeout(() => {
        validateFieldInternal(fieldName, trigger);
      }, debounceMs);
      debounceTimers.set(fieldName, timer);
    }

    async function validateFieldInternal(name: string, trigger: "change" | "blur" | "submit" = "change"): Promise<string[]> {
      const field = fieldMap.get(name);
      if (!field) return [];

      const el = resolveElement(field.element);
      if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement) && !(el instanceof HTMLSelectElement)) {
        const nested = el?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input,textarea,select");
        if (!nested) return [];
      }
      const inputEl = (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)
        ? el
        : el!.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input,textarea,select")!;

      const value = inputEl?.value ?? "";
      const context: ValidationContext = {
        values: getFormValues(),
        fieldName: name,
        form: formEl,
      };

      const errors: string[] = [];

      for (const rule of field.rules) {
        const triggers = Array.isArray(rule.trigger) ? rule.trigger : [rule.trigger ?? "change"];
        if (!triggers.includes(trigger) && trigger !== "submit") continue;

        const result = await rule.validate(value, context);
        if (result) {
          errors.push(result);
          if (!rule.async) break; // Stop at first sync error
        }
      }

      // Update UI
      const errContainer = errorContainers.get(name);
      const renderErr = field.renderError ?? getDefaultErrorRenderer(opts.errorClass);
      const clearErr = field.clearError ?? getDefaultClearError();

      if (errors.length > 0) {
        if (errContainer) renderErr(errors[0], errContainer);
        inputEl?.classList.add(opts.errorClass);
        inputEl?.classList.remove(opts.validClass);
        if (field.label) {
          inputEl?.setAttribute("aria-invalid", "true");
          inputEl?.setAttribute("aria-describedby", `${name}-error`);
        }
      } else {
        if (errContainer) clearErr(errContainer);
        inputEl?.classList.remove(opts.errorClass);
        inputEl?.classList.add(opts.validClass);
        inputEl?.removeAttribute("aria-invalid");
      }

      // Update state
      updateState(name, errors);

      opts.onFieldValidate?.(name, errors.length === 0, errors);

      return errors;
    }

    function getFormValues(): Record<string, unknown> {
      const values: Record<string, unknown> = {};
      const inputs = formEl.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        "input,textarea,select"
      );
      for (const input of inputs) {
        if (input.name) {
          if (input.type === "checkbox") {
            values[input.name] = (input as HTMLInputElement).checked;
          } else if (input.type === "radio") {
            if ((input as HTMLInputElement).checked) values[input.name] = input.value;
          } else {
            values[input.name] = input.value;
          }
        }
      }
      return values;
    }

    function updateState(fieldName: string, errors: string[]): void {
      // Remove old errors for this field
      currentState.errors = currentState.errors.filter((e) => e.fieldName !== fieldName);
      delete currentState.fieldErrors[fieldName];

      if (errors.length > 0) {
        const field = fieldMap.get(fieldName)!;
        currentState.errors.push({
          fieldName,
          ruleName: field.rules[0]?.name ?? "unknown",
          message: errors[0],
        });
        currentState.fieldErrors[fieldName] = errors;
      }

      currentState.isValid = currentState.errors.length === 0;
    }

    async function validate(): Promise<ValidationResult> {
      // Clear previous errors
      clearErrors();

      const allErrors: ValidationError[] = [];
      const allFieldErrors: Record<string, string[]> = {};

      for (const [name] of fieldMap) {
        const errors = await validateFieldInternal(name, "submit");
        if (errors.length > 0) {
          const field = fieldMap.get(name)!;
          allErrors.push({ fieldName: name, ruleName: field.rules[0]?.name ?? "unknown", message: errors[0] });
          allFieldErrors[name] = errors;
        }
      }

      currentState = {
        isValid: allErrors.length === 0,
        errors: allErrors,
        fieldErrors: allFieldErrors,
      };

      // Render summary
      if (opts.showSummary && allErrors.length > 0) {
        renderSummary(allErrors);
      }

      // Scroll to first error
      if (opts.scrollToError && allErrors.length > 0) {
        const firstErrContainer = errorContainers.get(allErrors[0].fieldName);
        if (firstErrContainer) {
          firstErrContainer.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }

      if (currentState.isValid) {
        opts.onValid?.();
      } else {
        opts.onInvalid?.(allErrors);
      }

      return currentState;
    }

    function renderSummary(errors: ValidationError[]): void {
      let summaryEl: HTMLElement | null = null;
      if (opts.summaryContainer) {
        summaryEl = resolveElement(opts.summaryContainer);
      }
      if (!summaryEl) {
        summaryEl = formEl.querySelector(".validation-summary");
        if (!summaryEl) {
          summaryEl = document.createElement("div");
          summaryEl.className = "validation-summary";
          summaryEl.style.cssText = `
            background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:16px;
          `;
          formEl.prepend(summaryEl);
        }
      }

      summaryEl.innerHTML = `
        <div style="font-weight:600;color:#dc2626;margin-bottom:8px;">
          Please fix the following ${errors.length} error${errors.length > 1 ? "s" : ""}:
        </div>
        <ul style="margin:0;padding-left:20px;color:#dc2626;font-size:13px;">
          ${errors.map((e) => `<li>${e.message}</li>`).join("")}
        </ul>
      `;
    }

    function clearErrors(): void {
      for (const [name, container] of errorContainers) {
        const field = fieldMap.get(name);
        const clearFn = field?.clearError ?? getDefaultClearError();
        clearFn(container);
      }

      // Remove visual error states
      for (const [, field] of fieldMap) {
        const el = resolveElement(field.element);
        const inputEl = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
          ? el
          : el?.querySelector("input,textarea,select");
        inputEl?.classList.remove(opts.errorClass);
        inputEl?.classList.remove(opts.validClass);
      }

      // Clear summary
      const summary = formEl.querySelector(".validation-summary");
      if (summary) summary.remove();

      currentState = { isValid: true, errors: [], fieldErrors: {} };
    }

    // Auto-bind submit
    if (opts.validateOnSubmit) {
      formEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        const result = await validate();
        if (result.isValid) {
          opts.onValid?.();
        }
      });
    }

    const instance: FormValidatorInstance = {
      formEl: formEl,

      validate,

      async validateField(name: string): Promise<string[]> {
        return validateFieldInternal(name, "submit");
      },

      getState() { return currentState; },

      setFieldError(name: string, message: string) {
        const errContainer = errorContainers.get(name);
        const field = fieldMap.get(name);
        if (errContainer && field) {
          const render = field.renderError ?? getDefaultErrorRenderer(opts.errorClass);
          render(message, errContainer);
          updateState(name, [message]);
        }
      },

      clearFieldError(name: string) {
        const errContainer = errorContainers.get(name);
        const field = fieldMap.get(name);
        if (errContainer && field) {
          const clear = field.clearError ?? getDefaultClearError();
          clear(errContainer);
          delete currentState.fieldErrors[name];
          currentState.errors = currentState.errors.filter((e) => e.fieldName !== name);
          currentState.isValid = currentState.errors.length === 0;
        }
      },

      clearErrors,

      reset() {
        clearErrors();
        formEl.reset();
      },

      destroy() {
        destroyed = true;
        for (const [, timer] of debounceTimers) clearTimeout(timer);
        debounceTimers.clear();
        // Note: we don't remove event listeners from formEl since it may be used elsewhere
      },
    };

    return instance;
  }
}

/** Convenience: create a form validator */
export function createFormValidator(options: FormValidationOptions): FormValidatorInstance {
  return new FormValidator().create(options);
}
