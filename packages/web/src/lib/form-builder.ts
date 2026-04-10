/**
 * Dynamic Form Builder: Schema-driven form generation with validation pipeline,
 * conditional fields, multi-step forms, async validation, field arrays,
 * and real-time state management.
 */

// --- Types ---

export type FieldType =
  | "text" | "email" | "password" | "number" | "tel" | "url" | "search"
  | "textarea" | "select" | "multiselect" | "radio" | "checkbox" | "switch"
  | "date" | "time" | "datetime-local" | "color" | "range" | "file"
  | "hidden" | "rich-text" | "code-editor" | "rating" | "signature";

export interface FieldValidation {
  required?: boolean | string;
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };
  pattern?: { regex: RegExp; message: string } | string;
  custom?: (value: unknown, formValues: Record<string, unknown>) => string | null;
  asyncCustom?: (value: unknown, formValues: Record<string, unknown>) => Promise<string | null>;
  validateIfDirty?: boolean;
}

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  description?: string;
  icon?: string;
}

export interface FormField<T = unknown> {
  name: string;
  type: FieldType;
  label?: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: T;
  validation?: FieldValidation;
  options?: SelectOption[];
  showWhen?: Record<string, unknown>;
  disableWhen?: Record<string, unknown>;
  span?: number;
  className?: string;
  attrs?: Record<string, string>;
  group?: string;
  order?: number;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
  step?: number;
  marks?: Array<{ value: number; label: string }>;
  maxRating?: number;
  dependsOn?: string[];
}

export interface FormSection {
  title: string;
  description?: string;
  collapsed?: boolean;
  fields: string[];
}

export interface FormSchema {
  fields: FormField[];
  sections?: FormSection[];
  name?: string;
  description?: string;
  submitLabel?: string;
  resetLabel?: string;
  layout?: "vertical" | "horizontal" | "inline" | "grid";
  gridColumns?: number;
}

export interface FieldError {
  field: string;
  message: string;
  type: string;
}

export interface FormState<T = Record<string, unknown>> {
  values: T;
  errors: FieldError[];
  touched: Set<string>;
  dirty: Set<string>;
  isValid: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  submitCount: number;
}

// --- Form Builder Class ---

export class FormBuilder<T extends Record<string, unknown> = Record<string, unknown>> {
  private schema: FormSchema;
  private state: FormState<T>;
  private listeners = new Set<(state: FormState<T>) => void>();
  private fieldListeners = new Map<string, Set<(value: unknown, error: string | null) => void>>();
  private asyncValidators = 0;
  private destroyRef = false;

  constructor(schema: FormSchema) {
    this.schema = schema;
    const defaults = this.extractDefaults();
    this.state = {
      values: defaults as T,
      errors: [],
      touched: new Set(),
      dirty: new Set(),
      isValid: true,
      isSubmitting: false,
      isSubmitted: false,
      submitCount: 0,
    };
  }

  // --- State Access ---

  getValues(): T { return { ...this.state.values }; }

  getFieldErrors(field: string): string[] {
    return this.state.errors.filter((e) => e.field === field).map((e) => e.message);
  }

  hasError(field: string): boolean { return this.state.errors.some((e) => e.field === field); }
  isTouched(field: string): boolean { return this.state.touched.has(field); }
  isDirty(field: string): boolean { return this.state.dirty.has(field); }

  getState(): FormState<T> {
    return {
      ...this.state,
      touched: new Set(this.state.touched),
      dirty: new Set(this.state.dirty),
    };
  }

  // --- Value Operations ---

  setValue(field: string, value: unknown, shouldValidate = true): void {
    const prev = this.state.values[field];
    (this.state.values as Record<string, unknown>)[field] = value;

    if (prev !== value) {
      this.state.dirty.add(field);
      const listeners = this.fieldListeners.get(field);
      if (listeners) for (const fn of listeners) { try { fn(value, null); } catch {} }
    }

    if (shouldValidate) this.validateField(field);
    this.notify();
  }

  getValue<K extends keyof T>(field: K): T[K] { return this.state.values[field]; }

  setValues(values: Partial<T>, shouldValidate = true): void {
    for (const [key, value] of Object.entries(values)) {
      (this.state.values as Record<string, unknown>)[key] = value;
      this.state.dirty.add(key);
    }
    if (shouldValidate) this.validateAll();
    this.notify();
  }

  resetField(field: string): void {
    const fieldDef = this.schema.fields.find((f) => f.name === field);
    if (fieldDef) {
      (this.state.values as Record<string, unknown>)[field] = fieldDef.defaultValue ?? null;
      this.state.touched.delete(field);
      this.state.dirty.delete(field);
      this.state.errors = this.state.errors.filter((e) => e.field !== field);
    }
    this.notify();
  }

  resetAll(): void {
    const defaults = this.extractDefaults();
    this.state.values = defaults as T;
    this.state.touched.clear();
    this.state.dirty.clear();
    this.state.errors = [];
    this.state.isSubmitted = false;
    this.state.submitCount = 0;
    this.notify();
  }

  // --- Validation ---

  async validateField(field: string): Promise<FieldError[]> {
    const fieldDef = this.schema.fields.find((f) => f.name === field);
    if (!fieldDef?.validation) return [];

    const value = this.state.values[field];
    const errors: FieldError[] = [];
    const v = fieldDef.validation;

    // Required check
    if (v.required && this.isEmpty(value)) {
      errors.push({
        field,
        message: typeof v.required === "string" ? v.required : `${fieldDef.label ?? field} is required`,
        type: "required",
      });
      this.updateErrors(errors);
      return errors;
    }

    // Skip other validations if empty and not required
    if (this.isEmpty(value)) {
      this.updateErrors(errors);
      return errors;
    }

    // MinLength
    if (v.minLength !== undefined) {
      const cfg = typeof v.minLength === "object"
        ? v.minLength
        : { value: v.minLength, message: `Must be at least ${v.minLength} characters` };
      if (typeof value === "string" && value.length < cfg.value) {
        errors.push({ field, message: cfg.message, type: "minLength" });
      }
    }

    // MaxLength
    if (v.maxLength !== undefined) {
      const cfg = typeof v.maxLength === "object"
        ? v.maxLength
        : { value: v.maxLength, message: `Must be no more than ${v.maxLength} characters` };
      if (typeof value === "string" && value.length > cfg.value) {
        errors.push({ field, message: cfg.message, type: "maxLength" });
      }
    }

    // Min
    if (v.min !== undefined) {
      const cfg = typeof v.min === "object"
        ? v.min
        : { value: v.min, message: `Must be at least ${v.min}` };
      if (typeof value === "number" && value < cfg.value) {
        errors.push({ field, message: cfg.message, type: "min" });
      }
    }

    // Max
    if (v.max !== undefined) {
      const cfg = typeof v.max === "object"
        ? v.max
        : { value: v.max, message: `Must be no more than ${v.max}` };
      if (typeof value === "number" && value > cfg.value) {
        errors.push({ field, message: cfg.message, type: "max" });
      }
    }

    // Pattern
    if (v.pattern !== undefined) {
      const cfg = typeof v.pattern === "object"
        ? v.pattern
        : { regex: new RegExp(v.pattern), message: "Invalid format" };
      if (typeof value === "string" && !cfg.regex.test(value)) {
        errors.push({ field, message: cfg.message, type: "pattern" });
      }
    }

    // Email format
    if (fieldDef.type === "email" && typeof value === "string") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push({ field, message: "Invalid email address", type: "format" });
      }
    }

    // URL format
    if (fieldDef.type === "url" && typeof value === "string") {
      try { new URL(value); } catch {
        errors.push({ field, message: "Invalid URL", type: "format" });
      }
    }

    // Custom sync validator
    if (v.custom) {
      const result = v.custom(value, this.state.values);
      if (result) errors.push({ field, message: result, type: "custom" });
    }

    // Update sync errors first
    this.updateErrors(errors);

    // Async custom validator
    if (v.asyncCustom) {
      this.asyncValidators++;
      const result = await v.asyncCustom(value, this.state.values);
      this.asyncValidators--;
      if (result) {
        const asyncErr = { field, message: result, type: "asyncCustom" };
        this.state.errors = [...this.state.errors, asyncErr];
        this.state.isValid = false;
        this.notify();
        return [...errors, asyncErr];
      }
    }

    return errors;
  }

  async validateAll(): Promise<boolean> {
    let allValid = true;
    const allErrors: FieldError[] = [];

    for (const field of this.schema.fields) {
      if (field.type === "hidden") continue;
      const errors = await this.validateField(field.name);
      allErrors.push(...errors);
      if (errors.length > 0) allValid = false;
    }

    this.state.errors = allErrors;
    this.state.isValid = allValid;
    this.notify();
    return allValid;
  }

  clearErrors(field?: string): void {
    if (field) {
      this.state.errors = this.state.errors.filter((e) => e.field !== field);
    } else {
      this.state.errors = [];
    }
    this.state.isValid = this.state.errors.length === 0;
    this.notify();
  }

  // --- Submission ---

  async onSubmit(
    handler: (values: T) => Promise<unknown> | unknown,
    options?: { onSuccess?: () => void; onError?: (errors: FieldError[]) => void },
  ): Promise<void> {
    this.state.isSubmitting = true;
    this.state.isSubmitted = true;
    this.state.submitCount++;
    this.notify();

    const valid = await this.validateAll();
    if (!valid) {
      this.state.isSubmitting = false;
      options?.onError?.(this.state.errors);
      this.notify();
      return;
    }

    try {
      await handler(this.getValues());
      this.state.isSubmitting = false;
      options?.onSuccess?.();
      this.notify();
    } catch (error) {
      this.state.isSubmitting = false;
      this.state.errors.push({
        field: "_submit",
        message: error instanceof Error ? error.message : "Submission failed",
        type: "submit",
      });
      this.state.isValid = false;
      options?.onError?.(this.state.errors);
      this.notify();
    }
  }

  // --- Subscriptions ---

  subscribe(listener: (state: FormState<T>) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  subscribeField(
    field: string,
    listener: (value: unknown, error: string | null) => void,
  ): () => void {
    if (!this.fieldListeners.has(field)) this.fieldListeners.set(field, new Set());
    this.fieldListeners.get(field)!.add(listener);
    listener(this.state.values[field], this.getFieldErrors(field)[0] ?? null);
    return () => this.fieldListeners.get(field)?.delete(listener);
  }

  // --- Schema Helpers ---

  getVisibleFields(): FormField[] {
    return this.schema.fields
      .filter((f) => f.type !== "hidden")
      .filter((f) => this.evaluateCondition(f.showWhen))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  getSections(): FormSection[] {
    return this.schema.sections ?? [
      { title: "", fields: this.schema.fields.map((f) => f.name) },
    ];
  }

  updateSchema(partial: Partial<FormSchema>): void {
    this.schema = { ...this.schema, ...partial };
  }

  // --- Private ---

  private extractDefaults(): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};
    for (const field of this.schema.fields) {
      if (field.defaultValue !== undefined) {
        defaults[field.name] = field.defaultValue;
      } else {
        switch (field.type) {
          case "checkbox": case "switch": defaults[field.name] = false; break;
          case "multiselect": defaults[field.name] = []; break;
          case "number": defaults[field.name] = 0; break;
          default: defaults[field.name] = "";
        }
      }
    }
    return defaults;
  }

  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined || value === "") return true;
    if (Array.isArray(value)) return value.length === 0;
    return false;
  }

  private evaluateCondition(condition?: Record<string, unknown>): boolean {
    if (!condition) return true;
    return Object.entries(condition).every(([key, expected]) => this.state.values[key] === expected);
  }

  private updateErrors(newErrors: FieldError[]): void {
    const fields = new Set(newErrors.map((e) => e.field));
    this.state.errors = this.state.errors.filter((e) => !fields.has(e.field));
    this.state.errors = [...this.state.errors, ...newErrors];
    this.state.isValid = this.state.errors.length === 0 && this.asyncValidators === 0;
  }

  private notify(): void {
    if (this.destroyRef) return;
    const state = this.getState();
    for (const fn of this.listeners) { try { fn(state); } catch {} }
  }

  destroy(): void {
    this.destroyRef = true;
    this.listeners.clear();
    this.fieldListeners.clear();
  }
}

// --- Utility Functions ---

/** Create a form builder from a schema */
export function createForm<T extends Record<string, unknown> = Record<string, unknown>>(
  schema: FormSchema,
): FormBuilder<T> {
  return new FormBuilder<T>(schema);
}

/** Common validation presets */
export const validations = {
  required: (label = "This field"): FieldValidation => ({
    required: true,
    ...{ required: `${label} is required` },
  }),
  email: (): FieldValidation => ({
    custom: (v) =>
      typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
        ? null
        : "Invalid email address",
  }),
  url: (): FieldValidation => ({
    custom: (v) => {
      try { new URL(v as string); return null; } catch { return "Invalid URL"; }
    },
  }),
  minLength: (n: number): FieldValidation => ({
    minLength: { value: n, message: `Must be at least ${n} characters` },
  }),
  maxLength: (n: number): FieldValidation => ({
    maxLength: { value: n, message: `Must be no more than ${n} characters` },
  }),
  min: (n: number): FieldValidation => ({ min: { value: n, message: `Must be at least ${n}` } }),
  max: (n: number): FieldValidation => ({ max: { value: n, message: `Must be no more than ${n}` } }),
  pattern: (regex: RegExp, msg: string): FieldValidation => ({ pattern: { regex, message: msg } }),
  passwordStrength: (): FieldValidation => ({
    custom: (v) => {
      if (typeof v !== "string") return "Password must be a string";
      if (v.length < 8) return "At least 8 characters";
      if (!/[A-Z]/.test(v)) return "One uppercase letter";
      if (!/[a-z]/.test(v)) return "One lowercase letter";
      if (!/[0-9]/.test(v)) return "One number";
      return null;
    },
  }),
  matchField: (fieldName: string, label?: string): FieldValidation => ({
    custom: (v, form) =>
      v === form[fieldName] ? null : `Must match ${label ?? fieldName}`,
  }),
  uniqueAsync: (checkFn: (value: string) => Promise<boolean>): FieldValidation => ({
    asyncCustom: async (v) => {
      if (typeof v !== "string" || !v) return null;
      const exists = await checkFn(v);
      return exists ? "This value is already taken" : null;
    },
  }),
};
