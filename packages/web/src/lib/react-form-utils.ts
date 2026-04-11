/**
 * React Form Utilities: Form state management, validation, field registration,
 * submission handling, error display, and form composition helpers.
 */

import type { ReactNode } from "react";

// --- Types ---

export type FormFieldValue = string | number | boolean | string[] | FileList | null | undefined;

export interface FieldValidationRule {
  /** Validation function: returns error message or empty string if valid */
  validate: (value: FormFieldValue) => string;
  /** When to trigger: "onChange", "onBlur", "onSubmit" */
  trigger?: "onChange" | "onBlur" | "onSubmit";
}

export interface FieldState<T = FormFieldValue> {
  value: T;
  error: string;
  touched: boolean;
  dirty: boolean;
  focused: boolean;
}

export interface FormState {
  values: Record<string, FormFieldValue>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
  submitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  submitCount: number;
}

export type FormSubmitHandler<T extends Record<string, FormFieldValue>> = (
  values: T,
  formHelpers: FormHelpers,
) => void | Promise<void>;

export interface FormHelpers {
  /** Set a specific field's value */
  setFieldValue: (name: string, value: FormFieldValue) => void;
  /** Set multiple field values at once */
  setFieldValues: (values: Partial<Record<string, FormFieldValue>>) => void;
  /** Set an error for a specific field */
  setFieldError: (name: string, error: string) => void;
  /** Clear all errors */
  clearErrors: () => void;
  /** Set all fields as touched */
  setAllTouched: () => void;
  /** Reset the entire form to initial state */
  reset: () => void;
  /** Get the current form state snapshot */
  getState: () => FormState;
}

export interface FormOptions<T extends Record<string, FormFieldValue> = Record<string, FormFieldValue>> {
  /** Initial form values */
  initialValues: T;
  /** Validation rules per field */
  validationRules?: Record<string, FieldValidationRule[]>;
  /** Called on valid form submit */
  onSubmit: FormSubmitHandler<T>;
  /** Called when any field changes */
  onChange?: (values: T, formState: FormState) => void;
  /** Validate on change? (default: false — validates onBlur) */
  validateOnChange?: boolean;
  /** Custom field-level transform before setting value */
  transform?: (name: string, value: FormFieldValue) => FormFieldValue;
}

// --- Built-in Validators ---

/** Required field validator */
export function required(message = "This field is required"): FieldValidationRule {
  return {
    validate: (value): string => {
      if (value === null || value === undefined || value === "") return message;
      if (Array.isArray(value) && value.length === 0) return message;
      return "";
    },
    trigger: "onBlur",
  };
}

/** Minimum length validator for strings/arrays */
export function minLength(min: number, message?: string): FieldValidationRule {
  return {
    validate: (value): string => {
      const len = typeof value === "string" ? value.length : Array.isArray(value) ? value.length : 0;
      return len < min ? (message ?? `Must be at least ${min} characters`) : "";
    },
    trigger: "onBlur",
  };
}

/** Maximum length validator */
export function maxLength(max: number, message?: string): FieldValidationRule {
  return {
    validate: (value): string => {
      const len = typeof value === "string" ? value.length : Array.isArray(value) ? value.length : 0;
      return len > max ? (message ?? `Must be no more than ${max} characters`) : "";
    },
    trigger: "onChange",
  };
}

/** Pattern/regex validator */
export function pattern(regex: RegExp, message = "Invalid format"): FieldValidationRule {
  return {
    validate: (value): string =>
      typeof value === "string" && !regex.test(value) ? message : "",
    trigger: "onBlur",
  };
}

/** Email format validator */
export function email(message = "Invalid email address"): FieldValidationRule {
  return pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message);
}

/** Minimum numeric value validator */
export function min(minVal: number, message?: string): FieldValidationRule {
  return {
    validate: (value): string =>
      typeof value === "number" && value < minVal
        ? (message ?? `Must be at least ${minVal}`)
        : "",
    trigger: "onBlur",
  };
}

/** Maximum numeric value validator */
export function max(maxVal: number, message?: string): FieldValidationRule {
  return {
    validate: (value): string =>
      typeof value === "number" && value > maxVal
        ? (message ?? `Must be no more than ${maxVal}`)
        : "",
    trigger: "onBlur",
  };
}

/** Custom validator factory */
export function custom(
  validateFn: (value: FormFieldValue) => string,
  trigger: "onChange" | "onBlur" | "onSubmit" = "onBlur",
): FieldValidationRule {
  return { validate: validateFn, trigger };
}

// --- Form Manager Class ---

/**
 * Manages form state outside of React's render cycle.
 * Can be used as a standalone utility or bridged to React via hooks.
 */
export class FormManager<T extends Record<string, FormFieldValue> = Record<string, FormFieldValue>> {
  private _initialValues: T;
  private _values: Record<string, FormFieldValue>;
  private _errors: Record<string, string> = {};
  private _touched: Record<string, boolean> = {};
  private _dirty: Record<string, boolean> = {};
  private _submitting = false;
  private _submitCount = 0;
  private _rules: Record<string, FieldValidationRule[]> = {};
  private _options: FormOptions<T>;

  constructor(options: FormOptions<T>) {
    this._options = options;
    this._initialValues = { ...options.initialValues };
    this._values = { ...options.initialValues };
    this._rules = options.validationRules ?? {};

    // Initialize dirty/touched as false for each field
    for (const key of Object.keys(this._initialValues)) {
      this._touched[key] = false;
      this._dirty[key] = false;
    }
  }

  // --- Public API ---

  get values(): T { return { ...this._values } as unknown as T; }

  get errors(): Record<string, string> { return { ...this._errors }; }

  get touched(): Record<string, boolean> { return { ...this._touched }; }

  get dirty(): Record<string, boolean> { return { ...this._dirty}; }

  get isDirty(): boolean { return Object.values(this._dirty).some(Boolean); }

  get isValid(): boolean { return Object.values(this._errors).every((e) => !e); }

  get isSubmitting(): boolean { return this._submitting; }

  get submitCount(): number { return this._submitCount; }

  getState(): FormState {
    return {
      values: { ...this._values },
      errors: { ...this._errors },
      touched: { ...this._touched },
      dirty: { ...this._dirty },
      submitting: this._submitting,
      isValid: this.isValid,
      isDirty: this.isDirty,
      submitCount: this._submitCount,
    };
  }

  /** Get the value of a single field */
  getValue(name: string): FormFieldValue {
    return this._values[name];
  }

  /** Get the error for a single field */
  getError(name: string): string {
    return this._errors[name] ?? "";
  }

  /** Check if a field has been touched */
  isTouched(name: string): boolean {
    return !!this._touched[name];
  }

  /** Check if a field is dirty (changed from initial) */
  isFieldDirty(name: string): boolean {
    return !!this._dirty[name];
  }

  /** Set a field's value and optionally validate */
  setFieldValue(name: string, value: FormFieldValue, shouldValidate = true): void {
    const transformed = this._options.transform
      ? this._options.transform(name, value)
      : value;

    this._values[name] = transformed;
    this._dirty[name] = JSON.stringify(transformed) !== JSON.stringify(this._initialValues[name]);

    if (shouldValidate && (this._options.validateOnChange || this._touched[name])) {
      this.validateField(name);
    }

    this._options.onChange?.(this.values as T, this.getState());
  }

  /** Set multiple field values */
  setFieldValues(values: Partial<Record<string, FormFieldValue>>, shouldValidate = true): void {
    for (const [name, value] of Object.entries(values)) {
      this.setFieldValue(name, value, shouldValidate);
    }
  }

  /** Set an error manually */
  setFieldError(name: string, error: string): void {
    this._errors[name] = error;
  }

  /** Mark a field as touched */
  setFieldTouched(name: string, touched = true, shouldValidate = true): void {
    this._touched[name] = touched;
    if (shouldValidate && touched) {
      this.validateField(name);
    }
  }

  /** Validate a single field */
  validateField(name: string): string {
    const rules = this._rules[name] ?? [];
    let error = "";

    for (const rule of rules) {
      error = rule.validate(this._values[name]);
      if (error) break;
    }

    if (error) {
      this._errors[name] = error;
    } else {
      delete this._errors[name];
    }

    return error;
  }

  /** Validate all fields */
  validateAllFields(): boolean {
    let valid = true;
    for (const name of Object.keys(this._values)) {
      const err = this.validateField(name);
      if (err) valid = false;
    }
    return valid;
  }

  /** Clear all errors */
  clearErrors(): void {
    this._errors = {};
  }

  /** Mark all fields as touched */
  setAllTouched(): void {
    for (const name of Object.keys(this._values)) {
      this._touched[name] = true;
    }
    this.validateAllFields();
  }

  /** Reset to initial values */
  reset(): void {
    this._values = { ...this._initialValues };
    this._errors = {};
    this._touched = {};
    this._dirty = {};
    this._submitting = false;
  }

  /** Submit the form */
  async submit(): Promise<void> {
    this.setAllTouched();

    if (!this.validateAllFields()) return;

    this._submitting = true;
    this._submitCount++;

    try {
      await this._options.onSubmit(this.values as T, this.getFormHelpers());
    } finally {
      this._submitting = false;
    }
  }

  // --- Private ---

  private getFormHelpers(): FormHelpers {
    return {
      setFieldValue: (name, val) => this.setFieldValue(name, val),
      setFieldValues: (vals) => this.setFieldValues(vals),
      setFieldError: (name, err) => this.setFieldError(name, err),
      clearErrors: () => this.clearErrors(),
      setAllTouched: () => this.setAllTouched(),
      reset: () => this.reset(),
      getState: () => this.getState(),
    };
  }
}

// --- Factory ---

/** Create a new form manager instance */
export function createFormManager<T extends Record<string, FormFieldValue>>(
  options: FormOptions<T>,
): FormManager<T> {
  return new FormManager(options);
}
