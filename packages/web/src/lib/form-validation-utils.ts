/**
 * Form Validation Utilities: Declarative form validation, field-level validators,
 * real-time feedback, cross-field validation, async validation, error formatting,
 * and form state management.
 */

// --- Types ---

export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  /** Fields that passed validation */
  validFields: string[];
}

export type ValidatorFn = (value: unknown, formData?: Record<string, unknown>) => string | null | Promise<string | null>;

export interface FieldRule {
  /** Field name */
  field: string;
  /** Display label (for error messages) */
  label?: string;
  /** One or more validator functions */
  validators: ValidatorFn[];
  /** Validate only when this condition is true */
  when?: (formData: Record<string, unknown>) => boolean;
  /** Custom error message (overrides validator return) */
  message?: string;
  /** Validate on "change", "blur", or "submit". Default "blur" */
  validateOn?: "change" | "blur" | "submit";
  /** Debounce validation in ms (for change events). Default 300 */
  debounceMs?: number;
  /** Whether the field is required. Shorthand for required() */
  required?: boolean;
}

export interface FormValidationConfig {
  /** Array of field rules */
  rules: FieldRule[];
  /** Called when any field's validity changes */
  onFieldChange?: (field: string, valid: boolean, error: string | null) => void;
  /** Called when entire form is validated */
  onValidate?: (result: ValidationResult) => void;
  /** Stop at first error per field. Default true */
  failFast?: boolean;
  /** Show errors for untouched fields on submit. Default true */
  validateUntouched?: boolean;
  /** Custom error formatter */
  formatError?: (error: ValidationError) => string;
}

export interface FormState {
  values: Record<string, unknown>;
  touched: Set<string>;
  dirty: Set<string>;
  errors: Map<string, string>;
  submitting: boolean;
  valid: boolean | null; // null = not yet validated
}

// --- Built-in Validators ---

/** Required field (non-empty) */
export function required(message = "This field is required"): ValidatorFn {
  return (value) => {
    if (value === null || value === undefined || value === "") return message;
    if (Array.isArray(value) && value.length === 0) return message;
    return null;
  };
}

/** Minimum length (string/array) */
export function minLength(min: number, message?: string): ValidatorFn {
  const msg = message ?? `Must be at least ${min} characters`;
  return (value) => {
    if (typeof value !== "string" && !Array.isArray(value)) return null;
    if ((value as string | unknown[]).length < min) return msg;
    return null;
  };
}

/** Maximum length */
export function maxLength(max: number, message?: string): ValidatorFn {
  const msg = message ?? `Must be no more than ${max} characters`;
  return (value) => {
    if (typeof value !== "string" && !Array.isArray(value)) return null;
    if ((value as string | unknown[]).length > max) return msg;
    return null;
  };
}

/** Value must match a regex pattern */
export function pattern(regex: RegExp, message = "Invalid format"): ValidatorFn {
  return (value) => {
    if (typeof value !== "string") return null;
    if (!regex.test(value)) return message;
    return null;
  };
}

/** Minimum numeric value */
export function min(minVal: number, message?: string): ValidatorFn {
  const msg = message ?? `Must be at least ${minVal}`;
  return (value) => {
    if (typeof value !== "number") return null;
    if (value < minVal) return msg;
    return null;
  };
}

/** Maximum numeric value */
export function max(maxVal: number, message?: string): ValidatorFn {
  const msg = message ?? `Must be no more than ${maxVal}`;
  return (value) => {
    if (typeof value !== "number") return null;
    if (value > maxVal) return msg;
    return null;
  };
}

/** Value must be one of allowed options */
export function oneOf(options: readonly unknown[], message?: string): ValidatorFn {
  const msg = message ?? `Must be one of: ${options.join(", ")}`;
  return (value) => {
    if (!options.includes(value)) return msg;
    return null;
  };
}

/** Value must NOT be one of excluded options */
export function noneOf(excluded: readonly unknown[], message?: string): ValidatorFn {
  const msg = message ?? `This value is not allowed`;
  return (value) => {
    if (excluded.includes(value)) return msg;
    return null;
  };
}

/** Email validation */
export function email(message = "Please enter a valid email address"): ValidatorFn {
  return pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message);
}

/** URL validation */
export function url(message = "Please enter a valid URL"): ValidatorFn {
  return pattern(/^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b/, message);
}

/** Custom validator with predicate function */
export function custom(
  fn: (value: unknown, formData?: Record<string, unknown>) => boolean,
  message = "Validation failed",
): ValidatorFn {
  return (value, formData) => (fn(value, formData) ? null : message);
}

/** Cross-field: value must equal another field's value */
export function matchesField(
  otherField: string,
  message?: string,
): ValidatorFn {
  const msg = message ?? `Must match the ${otherField} field`;
  return (value, formData) => {
    if (!formData || formData[otherField] === undefined) return null;
    if (value !== formData[otherField]) return msg;
    return null;
  };
}

/** Cross-field: value must differ from another field */
export function differsFrom(
  otherField: string,
  message?: string,
): ValidatorFn {
  const msg = message ?? `Must differ from the ${otherField} field`;
  return (value, formData) => {
    if (!formData || formData[otherField] === undefined) return null;
    if (value === formData[otherField]) return msg;
    return null;
  };
}

/** Async validator wrapper */
export function asyncValidator(
  fn: (value: unknown, formData?: Record<string, unknown>) => Promise<string | null>,
): ValidatorFn {
  return (value, formData) => fn(value, formData) as unknown as string | null;
}

// --- Form Validator Class ---

/**
 * FormValidator - manages validation state for an HTML form.
 *
 * @example
 * ```ts
 * const validator = new FormValidator(formEl, {
 *   rules: [
 *     { field: "email", label: "Email", validators: [required(), email()] },
 *     { field: "password", label: "Password", validators: [required(), minLength(8)] },
 *     { field: "confirmPassword", label: "Confirm Password",
 *       validators: [required(), matchesField("password")] },
 *   ],
 *   onValidate: (r) => r.valid ? form.submit() : showErrors(r.errors),
 * });
 * ```
 */
export class FormValidator {
  private form: HTMLFormElement;
  private config: Required<FormValidationConfig>;
  private _state: FormState;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private cleanupFns: Array<() => void> = [];

  constructor(form: HTMLFormElement | string, config: FormValidationConfig) {
    this.form = typeof form === "string"
      ? document.querySelector<HTMLFormElement>(form)!
      : form;

    this.config = {
      failFast: config.failFast ?? true,
      validateUntouched: config.validateUntouched ?? true,
      ...config,
    };

    this._state = {
      values: {},
      touched: new Set(),
      dirty: new Set(),
      errors: new Map(),
      submitting: false,
      valid: null,
    };

    this._extractValues();
    this._bindEvents();
  }

  /** Get current form state */
  getState(): FormState {
    return {
      ...this._state,
      touched: new Set(this._state.touched),
      dirty: new Set(this._state.dirty),
      errors: new Map(this._state.errors),
    };
  }

  /** Get current field values */
  getValues(): Record<string, unknown> { return { ...this._state.values }; }

  /** Get errors for a specific field */
  getFieldError(field: string): string | null {
    return this._state.errors.get(field) ?? null;
  }

  /** Check if a specific field is valid */
  isFieldValid(field: string): boolean {
    return !this._state.errors.has(field);
  }

  /** Check if entire form is valid */
  isValid(): boolean {
    if (this._state.valid === null) return false;
    return this._state.valid;
  }

  /** Validate all fields (typically called on submit) */
  validate(): ValidationResult {
    this._extractValues();

    const errors: ValidationError[] = [];
    const validFields: string[] = [];

    for (const rule of this.config.rules) {
      // Skip conditional rules
      if (rule.when && !rule.when(this._state.values)) continue;

      // Skip untouched fields unless configured otherwise
      if (!this.config.validateUntouched && !this._state.touched.has(rule.field)) {
        // Still check if there's already an error
        if (this._state.errors.has(rule.field)) {
          errors.push({
            field: rule.field,
            message: this._state.errors.get(rule.field)!,
            value: this._state.values[rule.field],
          });
        }
        continue;
      }

      const value = this._state.values[rule.field];
      let fieldError: string | null = null;

      for (const validator of rule.validators) {
        const result = validator(value, this._state.values);

        // Handle async validators
        if (result instanceof Promise) {
          result.then((asyncError) => {
            if (asyncError) {
              this._setFieldError(rule.field, asyncError ?? rule.message ?? "Validation failed");
              this.config.onFieldChange?.(rule.field, false, asyncError);
            }
          });
          continue;
        }

        if (result !== null) {
          fieldError = rule.message ?? result;
          if (this.config.failFast) break;
        }
      }

      if (fieldError) {
        this._setFieldError(rule.field, fieldError);
        errors.push({ field: rule.field, message: fieldError, value });
        this.config.onFieldChange?.(rule.field, false, fieldError);
      } else {
        this._clearFieldError(rule.field);
        validFields.push(rule.field);
        this.config.onFieldChange?.(rule.field, true, null);
      }
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      validFields,
    };

    this._state.valid = result.valid;
    this.config.onValidate?.(result);
    return result;
  }

  /** Validate a single field */
  validateField(field: string): string | null {
    const rule = this.config.rules.find((r) => r.field === field);
    if (!rule) return null;

    const value = this._state.values[field];
    let error: string | null = null;

    for (const validator of rule.validators) {
      const result = validator(value, this._state.values);
      if (result instanceof Promise) continue;
      if (result !== null) {
        error = rule.message ?? result;
        if (this.config.failFast) break;
      }
    }

    if (error) {
      this._setFieldError(field, error);
    } else {
      this._clearFieldError(field);
    }

    this.config.onFieldChange?.(field, !error, error);
    return error;
  }

  /** Reset all validation state */
  reset(): void {
    this._state.touched.clear();
    this._state.dirty.clear();
    this._state.errors.clear();
    this._state.submitting = false;
    this._state.valid = null;
    this._debounceTimers.forEach((t) => clearTimeout(t));
    this._debounceTimers.clear();
  }

  /** Mark a field as touched (shows its errors) */
  touch(field: string): void {
    this._state.touched.add(field);
    this.validateField(field);
  }

  /** Mark all fields as touched */
  touchAll(): void {
    for (const rule of this.config.rules) {
      this._state.touched.add(rule.field);
    }
    this.validate();
  }

  /** Update a field's value programmatically */
  setValue(field: string, value: unknown): void {
    this._state.values[field] = value;
    this._state.dirty.add(field);

    // Re-validate if already touched
    if (this._state.touched.has(field)) {
      this.validateField(field);
    }
  }

  /** Destroy and clean up event listeners */
  destroy(): void {
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
    this.reset();
  }

  // --- Private ---

  private _extractValues(): void {
    const formData = new FormData(this.form);
    this._state.values = Object.fromEntries(formData.entries());
  }

  private _setFieldError(field: string, message: string): void {
    this._state.errors.set(field, message);
  }

  private _clearFieldError(field: string): void {
    this._state.errors.delete(field);
  }

  private _bindEvents(): void {
    for (const rule of this.config.rules) {
      const el = this.form.elements.namedItem(rule.field) as HTMLElement | null;
      if (!el) continue;

      const validateOn = rule.validateOn ?? "blur";

      if (validateOn === "blur") {
        el.addEventListener("blur", () => {
          this._state.touched.add(rule.field);
          this.validateField(rule.field);
        });
        this.cleanupFns.push(() =>
          el.removeEventListener("blur", () => {}),
        );
      } else if (validateOn === "change") {
        const ms = rule.debounceMs ?? 300;
        el.addEventListener("input", () => {
          this._state.dirty.add(rule.field);
          this._extractValues();

          const existing = this._debounceTimers.get(rule.field);
          if (existing) clearTimeout(existing);

          this._debounceTimers.set(rule.field, setTimeout(() => {
            this.validateField(rule.field);
          }, ms));
        });
        this.cleanupFns.push(() => {
          const t = this._debounceTimers.get(rule.field);
          if (t) clearTimeout(t);
        });
      }
    }

    // Form submit
    const onSubmit = (e: Event) => {
      e.preventDefault();
      this._state.submitting = true;
      this.touchAll();
    };

    this.form.addEventListener("submit", onSubmit);
    this.cleanupFns.push(() => this.form.removeEventListener("submit", onSubmit));
  }
}
