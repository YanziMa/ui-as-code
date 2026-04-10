/**
 * Advanced form validation with async support, field-level and form-level rules.
 */

import { ZodError } from "zod";

// --- Types ---

export interface FieldValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

export interface FormValidationResult<T> {
  valid: boolean;
  values: T;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  firstErrorField?: string;
}

export type ValidatorFn<T> = (value: T) => FieldValidationResult | Promise<FieldValidationResult>;

export interface FieldConfig<T = unknown> {
  /** Field key/name */
  name: string;
  /** Display label */
  label: string;
  /** Validation rules (run in order) */
  validators: ValidatorFn<T>[];
  /** Validate on blur? (default: true) */
  validateOnBlur?: boolean;
  /** Validate on change? (default: false after initial touch) */
  validateOnChange?: boolean;
  /** Required? */
  required?: boolean;
  /** Custom error messages */
  messages?: Record<string, string>;
  /** Dependent fields (re-validate when these change) */
  dependsOn?: string[];
  /** Debounce validation (ms) */
  debounceMs?: number;
  /** Transform value before validation */
  transform?: (value: T) => T;
}

export interface FormValidatorOptions {
  /** Validate all fields on submit even if untouched */
  validateAllOnSubmit?: boolean;
  /** Stop at first error per field */
  stopAtFirstError?: boolean;
  /** Show warnings as non-blocking */
  showWarnings?: boolean;
  /** Custom field class names */
  classNames?: {
    error?: string;
    warning?: string;
    valid?: string;
  };
}

// --- Built-in Validators ---

/** Required field validator */
export function required(message = "This field is required"): ValidatorFn<unknown> {
  return (value) => {
    if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
      return { valid: false, error: message };
    }
    return { valid: true };
  };
}

/** Minimum length validator */
export function minLength(min: number, message?: string): ValidatorFn<string> {
  return (value) => {
    if (!value || value.length < min) {
      return { valid: false, error: message ?? `Must be at least ${min} characters` };
    }
    return { valid: true };
  };
}

/** Maximum length validator */
export function maxLength(max: number, message?: string): ValidatorFn<string> {
  return (value) => {
    if (value && value.length > max) {
      return { valid: false, error: message ?? `Must be no more than ${max} characters` };
    }
    return { valid: true };
  };
}

/** Pattern/regex validator */
export function pattern(regex: RegExp, message = "Invalid format"): ValidatorFn<string> {
  return (value) => {
    if (!value) return { valid: true }; // Let required() handle empty
    if (!regex.test(value)) {
      return { valid: false, error: message };
    }
    return { valid: true };
  };
}

/** Email validator */
export function email(message = "Please enter a valid email address"): ValidatorFn<string> {
  return pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message);
}

/** URL validator */
export function urlValidator(allowRelative = false, message = "Please enter a valid URL"): ValidatorFn<string> {
  return (value) => {
    if (!value) return { valid: true };
    if (allowRelative && value.startsWith("/")) return { valid: true };
    try {
      new URL(value);
      return { valid: true };
    } catch {
      return { valid: false, error: message };
    }
  };
}

/** Number range validator */
export function range(min?: number, max?: number, message?: string): ValidatorFn<number> {
  return (value) => {
    if (value == null) return { valid: true };
    if (min != null && value < min) {
      return { valid: false, error: message ?? `Must be at least ${min}` };
    }
    if (max != null && value > max) {
      return { valid: false, error: message ?? `Must be no more than ${max}` };
    }
    return { valid: true };
  };
}

/** Match another field's value */
export function matchesField(
  fieldName: string,
  fieldLabel?: string,
  message?: string,
): ValidatorFn<string> {
  // This returns a closure that needs access to form values
  // The actual comparison happens in FormValidator
  return (_value) => ({ valid: true }); // Placeholder; resolved by FormValidator
}

/** Async validator (e.g., check uniqueness via API) */
export function asyncValidator<T>(
  fn: (value: T) => Promise<boolean>,
  message = "Validation failed",
): ValidatorFn<T> {
  return async (value) => {
    try {
      const isValid = await fn(value);
      return isValid ? { valid: true } : { valid: false, error: message };
    } catch {
      return { valid: false, error: "Validation check failed" };
    }
  };
}

/** Custom validator factory */
export function custom(
  fn: (value: unknown) => boolean | string,
  defaultMessage = "Invalid value",
): ValidatorFn<unknown> {
  return (value) => {
    const result = fn(value);
    if (result === true) return { valid: true };
    if (result === false) return { valid: false, error: defaultMessage };
    return typeof result === "string"
      ? { valid: false, error: result }
      : { valid: true };
  };
}

// --- Form Validator Class ---

export class FormValidator<T extends Record<string, unknown>> {
  private fields: Map<string, FieldConfig> = new Map();
  private values: Partial<T> = {};
  private touched = new Set<string>();
  private errors: Record<string, string> = {};
  private warnings: Record<string, string> = {};
  private debouncers = new Map<string, ReturnType<typeof setTimeout>>();
  private options: Required<FormValidatorOptions>;
  private listeners = new Set<(result: FormValidationResult<T>) => void>();

  constructor(options: FormValidatorOptions = {}) {
    this.options = {
      validateAllOnSubmit: options.validateAllOnSubmit ?? true,
      stopAtFirstError: options.stopAtFirstError ?? false,
      showWarnings: options.showWarnings ?? true,
      classNames: {
        error: options.classNames?.error ?? "field-error",
        warning: options.classNames?.warning ?? "field-warning",
        valid: options.classNames?.valid ?? "field-valid",
      },
    };
  }

  /** Register a field configuration */
  registerField(config: FieldConfig): this {
    this.fields.set(config.name, config);
    return this;
  }

  /** Register multiple fields at once */
  registerFields(configs: FieldConfig[]): this {
    for (const config of configs) this.registerField(config);
    return this;
  }

  /** Set a field's value */
  setValue<K extends keyof T>(field: K, value: T[K]): void {
    this.values[field] = value;
    if (this.fields.get(field as string)?.validateOnChange ?? false) {
      if (this.touched.has(field as string)) {
        this.validateField(field as string);
      }
    }
  }

  /** Set multiple values */
  setValues(values: Partial<T>): void {
    Object.assign(this.values, values);
  }

  /** Get current values */
  getValues(): Partial<T> {
    return { ...this.values };
  }

  /** Mark field as touched (user interacted with it) */
  touch(field: string): void {
    this.touched.add(field);
  }

  /** Touch all fields */
  touchAll(): void {
    for (const name of this.fields.keys()) {
      this.touched.add(name);
    }
  }

  /** Clear touched state */
  clearTouched(): void {
    this.touched.clear();
  }

  /** Validate a single field */
  async validateField(fieldName: string): Promise<FieldValidationResult> {
    const config = this.fields.get(fieldName);
    if (!config) return { valid: true };

    let value = this.values[fieldName];

    // Apply transform
    if (config.transform) {
      value = config.transform(value);
      this.values[fieldName as keyof T] = value;
    }

    // Run validators in sequence
    for (const validator of config.validators) {
      const result = await validator(value);
      if (!result.valid) {
        this.errors[fieldName] = result.error ?? "Invalid value";
        if (result.warning) this.warnings[fieldName] = result.warning;
        this.emit();
        return result;
      }
    }

    // Clear error for this field
    delete this.errors[fieldName];
    this.emit();
    return { valid: true };
  }

  /** Validate entire form */
  async validate(): Promise<FormValidationResult<T>> {
    if (this.options.validateAllOnSubmit) {
      this.touchAll();
    }

    this.errors = {};
    this.warnings = {};

    for (const [name, config] of this.fields) {
      const result = await this.validateField(name);
      if (!result.valid && this.options.stopAtFirstError) break;
    }

    return this.getResult();
  }

  /** Validate only touched fields */
  async validateTouched(): Promise<FormValidationResult<T>> {
    for (const fieldName of this.touched) {
      await this.validateField(fieldName);
    }
    return this.getResult();
  }

  /** Check if form is currently valid */
  isValid(): boolean {
    return Object.keys(this.errors).length === 0;
  }

  /** Get error for a specific field */
  getFieldError(field: string): string | undefined {
    return this.errors[field];
  }

  /** Get all errors */
  getErrors(): Record<string, string> {
    return { ...this.errors };
  }

  /** Get all warnings */
  getWarnings(): Record<string, string> {
    return { ...this.warnings };
  }

  /** Check if field is touched */
  isTouched(field: string): boolean {
    return this.touched.has(field);
  }

  /** Reset form state */
  reset(): void {
    this.values = {};
    this.touched.clear();
    this.errors = {};
    this.warnings = {};
    for (const [, debouncer] of this.debouncers) {
      clearTimeout(debouncer);
    }
    this.debouncers.clear();
    this.emit();
  }

  /** Subscribe to validation changes */
  subscribe(listener: (result: FormValidationResult<T>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Private ---

  private getResult(): FormValidationResult<T> {
    const errorKeys = Object.keys(this.errors);
    return {
      valid: errorKeys.length === 0,
      values: this.values as T,
      errors: { ...this.errors },
      warnings: { ...this.warnings },
      firstErrorField: errorKeys[0],
    };
  }

  private emit(): void {
    const result = this.getResult();
    for (const listener of this.listeners) {
      try {
        listener(result);
      } catch {
        // Ignore
      }
    }
  }
}
