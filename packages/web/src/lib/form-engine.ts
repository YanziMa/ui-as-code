/**
 * Form Engine: Advanced form state management with validation, multi-step forms,
 * conditional fields, async validation, field-level error handling, debounced
 * input, form persistence, field dependencies, and submission orchestration.
 */

// --- Types ---

export type FieldName = string;
export type FormId = string;

export type FieldType =
  | "text" | "email" | "password" | "number" | "tel" | "url"
  | "textarea" | "select" | "multiselect" | "checkbox" | "radio"
  | "switch" | "date" | "time" | "datetime-local" | "file"
  | "color" | "range" | "hidden" | "custom";

export interface FieldValidationRule {
  /** Rule name or custom identifier */
  name: string;
  /** Validation function — returns error message string or null if valid */
  validate: (value: unknown, values: Record<string, unknown>, context: ValidationContext) => string | null;
  /** Run this rule only when condition is met */
  when?: (values: Record<string, unknown>) => boolean;
  /** Debounce this specific rule (ms) */
  debounceMs?: number;
  /** Priority order (lower = runs first) */
  priority?: number;
}

export interface ValidationContext {
  fieldName: FieldName;
  formId: FormId;
  touchedFields: Set<FieldName>;
  submitted: boolean;
  submitCount: number;
  extra?: Record<string, unknown>;
}

export interface FieldError {
  field: FieldName;
  message: string;
  rule?: string;
  timestamp: number;
}

export interface FieldDefinition<V = unknown> {
  name: FieldName;
  label?: string;
  type: FieldType;
  defaultValue?: V;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  /** Show this field only when conditions on other fields are met */
  showWhen?: (values: Record<string, unknown>) => boolean;
  /** Validation rules */
  rules?: FieldValidationRule[];
  /** Custom serializer for form value */
  serialize?: (value: V) => unknown;
  /** Custom deserializer */
  deserialize?: (raw: unknown) => V;
  /** Options for select/radio/checkbox types */
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  /** Min/max constraints */
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  /** CSS class overrides */
  className?: string;
  /** Extra metadata */
  meta?: Record<string, unknown>;
}

export interface FormState<TValues = Record<string, unknown>> {
  values: TValues;
  initialValues: TValues;
  errors: FieldError[];
  touched: Set<FieldName>;
  dirtyFields: Set<FieldName>;
  isValidating: Set<FieldName>;
  isSubmitting: boolean;
  isSubmitted: boolean;
  submitCount: number;
  submitError: Error | null;
  lastSubmitAt: number | null;
}

export interface StepDefinition {
  id: string;
  title?: string;
  description?: string;
  /** Fields belonging to this step */
  fields: FieldName[];
  /** Validate before proceeding to next step */
  validateOnAdvance?: boolean;
  /** Skip this step based on form values */
  skipWhen?: (values: Record<string, unknown>) => boolean;
  /** Custom validation for the entire step */
  stepValidator?: (values: Record<string, unknown>) => FieldError[] | null;
}

export interface FormConfig<TValues = Record<string, unknown>> {
  id?: FormId;
  /** Field definitions */
  fields: FieldDefinition[];
  /** Initial values */
  initialValues?: Partial<TValues>;
  /** Multi-step mode */
  steps?: StepDefinition[];
  /** Global validation mode: "onChange" | "onBlur" | "onSubmit" | "all" */
  validateMode?: "onChange" | "onBlur" | "onSubmit" | "all";
  /** Debounce validation input (ms, default: 300) */
  validationDebounceMs?: number;
  /** Called on every state change */
  onChange?: (state: FormState<TValues>) => void;
  /** Called when form is submitted with valid data */
  onSubmit?: (values: TValues) => Promise<unknown> | unknown;
  /** Called on submission failure */
  onSubmitError?: (error: Error) => void;
  /** Revalidate all fields when any field changes */
  revalidateOnChange?: boolean;
  /** Enable form persistence (localStorage key) */
  persistKey?: string;
  /** Auto-save interval (ms) */
  autoSaveIntervalMs?: number;
  /** Confirm navigation if form has unsaved changes */
  confirmUnsavedChanges?: boolean;
  /** Scroll to first error on submit */
  scrollToError?: boolean;
  /** Focus first invalid field on submit */
  focusFirstInvalid?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FieldError[];
  fieldErrors: Map<FieldName, FieldError[]>;
  validatedAt: number;
}

// --- Built-in Validators ---

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export const validators = {
  required: (msg = "This field is required"): FieldValidationRule => ({
    name: "required",
    validate: (v) =>
      v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)
        ? msg : null,
    priority: 0,
  }),

  email: (msg = "Please enter a valid email address"): FieldValidationRule => ({
    name: "email",
    validate: (v) => (typeof v === "string" && !emailRegex.test(v)) ? msg : null,
    priority: 1,
  }),

  url: (msg = "Please enter a valid URL"): FieldValidationRule => ({
    name: "url",
    validate: (v) => (typeof v === "string" && v !== "" && !urlRegex.test(v)) ? msg : null,
    priority: 1,
  }),

  minLength: (min: number, msg?: string): FieldValidationRule => ({
    name: "minLength",
    validate: (v) => (typeof v === "string" && v.length < min)
      ? (msg ?? `Must be at least ${min} characters`) : null,
    priority: 2,
  }),

  maxLength: (max: number, msg?: string): FieldValidationRule => ({
    name: "maxLength",
    validate: (v) => (typeof v === "string" && v.length > max)
      ? (msg ?? `Must be no more than ${max} characters`) : null,
    priority: 2,
  }),

  min: (minVal: number, msg?: string): FieldValidationRule => ({
    name: "min",
    validate: (v) => (typeof v === "number" && v < minVal)
      ? (msg ?? `Must be at least ${minVal}`) : null,
    priority: 2,
  }),

  max: (maxVal: number, msg?: string): FieldValidationRule => ({
    name: "max",
    validate: (v) => (typeof v === "number" && v > maxVal)
      ? (msg ?? `Must be no more than ${maxVal}`) : null,
    priority: 2,
  }),

  pattern: (regex: RegExp, msg = "Format is invalid"): FieldValidationRule => ({
    name: "pattern",
    validate: (v) => (typeof v === "string" && !regex.test(v)) ? msg : null,
    priority: 3,
  }),

  matchesField: (otherField: FieldName, msg?: string): FieldValidationRule => ({
    name: "matchesField",
    validate: (v, vals) => (v !== vals[otherField])
      ? (msg ?? `Must match ${otherField}`) : null,
    priority: 4,
  }),

  custom: (
    fn: (value: unknown, values: Record<string, unknown>) => string | null,
    name = "custom",
  ): FieldValidationRule => ({ name, validate: fn, priority: 5 }),

  async: (
    fn: (value: unknown, values: Record<string, unknown>) => Promise<string | null>,
    name = "async",
  ): FieldValidationRule => ({ name, validate: fn as FieldValidationRule["validate"], priority: 6 }),
};

// --- FormEngine Implementation ---

export class FormEngine<TValues = Record<string, unknown>> {
  private config: Required<Pick<FormConfig<TValues>, "validateMode" | "validationDebounceMs" | "revalidateOnChange" | "scrollToError" | "focusFirstInvalid">> & Omit<FormConfig<TValues>, "validateMode" | "validationDebounceMs" | "revalidateOnChange" | "scrollToError" | "focusFirstInvalid">;

  private fieldMap = new Map<FieldName, FieldDefinition>();
  private state: FormState<TValues>;
  private debounceTimers = new Map<FieldName, ReturnType<typeof setTimeout>>();
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;
  private currentStepIndex = 0;
  private listeners = new Set<(state: FormState<TValues>) => void>();

  constructor(config: FormConfig<TValues>) {
    this.config = {
      validateMode: config.validateMode ?? "onBlur",
      validationDebounceMs: config.validationDebounceMs ?? 300,
      revalidateOnChange: config.revalidateOnChange ?? false,
      scrollToError: config.scrollToError ?? true,
      focusFirstInvalid: config.focusFirstInvalid ?? true,
      ...config,
    };

    // Build initial values
    const initialValues: Record<string, unknown> = {};
    for (const field of config.fields) {
      this.fieldMap.set(field.name, field);
      initialValues[field.name] = field.defaultValue ?? null;
    }

    // Merge provided initial values
    const mergedInitials = { ...initialValues, ...(config.initialValues ?? {}) } as TValues;

    // Restore from persistence
    let restoredValues: Record<string, unknown> | null = null;
    if (config.persistKey && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(config.persistKey);
        if (saved) restoredValues = JSON.parse(saved);
      } catch { /* ignore */ }
    }

    this.state = {
      values: (restoredValues ?? mergedInitials) as TValues,
      initialValues: mergedInitials,
      errors: [],
      touched: new Set(),
      dirtyFields: new Set(),
      isValidating: new Set(),
      isSubmitting: false,
      isSubmitted: false,
      submitCount: 0,
      submitError: null,
      lastSubmitAt: null,
    };

    // Setup auto-save
    if (config.autoSaveIntervalMs) {
      this.autoSaveTimer = setInterval(() => this.persist(), config.autoSaveIntervalMs);
    }

    // Setup unload protection
    if (config.confirmUnsavedChanges && typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.handleBeforeUnload);
    }
  }

  // --- State Accessors ---

  getState(): FormState<TValues> { return { ...this.state }; }

  getValues(): TValues { return { ...this.state.values }; }

  getValue<V>(field: FieldName): V { return this.state.values[field] as V; }

  getFieldValue(field: FieldName): unknown { return this.state.values[field]; }

  getErrors(): FieldError[] { return [...this.state.errors]; }

  getFieldErrors(field: FieldName): FieldError[] {
    return this.state.errors.filter((e) => e.field === field);
  }

  hasError(field?: FieldName): boolean {
    if (field) return this.state.errors.some((e) => e.field === field);
    return this.state.errors.length > 0;
  }

  isTouched(field?: FieldName): boolean {
    if (field) return this.state.touched.has(field);
    return this.state.touched.size > 0;
  }

  isDirty(field?: FieldName): boolean {
    if (field) return this.state.dirtyFields.has(field);
    return this.state.dirtyFields.size > 0;
  }

  isValid(): boolean {
    const result = this.validate();
    return result.isValid;
  }

  isSubmitting(): boolean { return this.state.isSubmitting; }

  isSubmitted(): boolean { return this.state.isSubmitted; }

  getCurrentStep(): number { return this.currentStepIndex; }

  getTotalSteps(): number { return this.config.steps?.length ?? 1; }

  // --- Mutations ---

  /**
   * Set a single field value.
   */
  setFieldValue(field: FieldName, value: unknown): void {
    if (this.destroyed) return;

    const def = this.fieldMap.get(field);
    if (def?.deserialize) {
      value = def.deserialize(value);
    }

    const prevValue = this.state.values[field];
    this.state.values = { ...this.state.values, [field]: value };

    // Track dirtiness
    if (!this.state.dirtyFields.has(field) && value !== prevValue) {
      this.state.dirtyFields.add(field);
    }

    // Validate on change
    if (this.config.validateMode === "onChange" || this.config.validateMode === "all") {
      this.debouncedValidate(field);
    }

    // Revalidate other fields if configured
    if (this.config.revalidateOnChange) {
      for (const [fn] of this.fieldMap) {
        if (fn !== field) this.debouncedValidate(fn);
      }
    }

    this.emitChange();
  }

  /**
   * Set multiple field values at once.
   */
  setFieldValues(values: Partial<TValues>): void {
    for (const [field, value] of Object.entries(values)) {
      this.setFieldValue(field, value);
    }
  }

  /**
   * Mark a field as touched (user interacted).
   */
  touchField(field: FieldName): void {
    if (!this.state.touched.has(field)) {
      this.state.touched.add(field);
      if (this.config.validateMode === "onBlur" || this.config.validateMode === "all") {
        this.validateField(field);
      }
      this.emitChange();
    }
  }

  /**
   * Mark multiple fields as touched.
   */
  touchFields(fields: FieldName[]): void {
    for (const f of fields) this.touchField(f);
  }

  /**
   * Reset a single field to its initial value.
   */
  resetField(field: FieldName): void {
    this.state.values = { ...this.state.values, [field]: this.state.initialValues[field] };
    this.state.dirtyFields.delete(field);
    this.state.touched.delete(field);
    this.clearFieldErrors(field);
    this.emitChange();
  }

  /**
   * Reset entire form to initial values.
   */
  reset(): void {
    this.state.values = { ...this.state.initialValues };
    this.state.errors = [];
    this.state.touched.clear();
    this.state.dirtyFields.clear();
    this.state.isValidating.clear();
    this.state.isSubmitting = false;
    this.state.isSubmitted = false;
    this.state.submitCount = 0;
    this.state.submitError = null;
    this.currentStepIndex = 0;
    this.emitChange();
  }

  /**
   * Clear all errors.
   */
  clearErrors(): void {
    this.state.errors = [];
    this.emitChange();
  }

  /**
   * Clear errors for a single field.
   */
  clearFieldErrors(field: FieldName): void {
    this.state.errors = this.state.errors.filter((e) => e.field !== field);
    this.emitChange();
  }

  /**
   * Manually set an error on a field.
   */
  setError(field: FieldName, message: string, rule?: string): void {
    this.state.errors.push({ field, message, rule, timestamp: Date.now() });
    this.emitChange();
  }

  // --- Validation ---

  /**
   * Validate a single field.
   */
  validateField(field: FieldName): FieldError[] {
    const def = this.fieldMap.get(field);
    if (!def) return [];

    const value = this.state.values[field];
    const errors: FieldError[] = [];
    const ctx: ValidationContext = {
      fieldName: field,
      formId: this.config.id ?? "default",
      touchedFields: this.state.touched,
      submitted: this.state.isSubmitted,
      submitCount: this.state.submitCount,
    };

    // Sort rules by priority
    const rules = [...(def.rules ?? [])].sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10));

    for (const rule of rules) {
      // Check `when` condition
      if (rule.when && !rule.when(this.state.values)) continue;

      try {
        const error = rule.validate(value, this.state.values, ctx);
        if (error) {
          errors.push({ field, message: error, rule: rule.name, timestamp: Date.now() });
          break; // Stop after first error per field
        }
      } catch (err) {
        errors.push({
          field,
          message: `Validation error: ${err instanceof Error ? err.message : String(err)}`,
          rule: rule.name,
          timestamp: Date.now(),
        });
        break;
      }
    }

    // Update state errors
    this.state.errors = this.state.errors.filter((e) => e.field !== field);
    this.state.errors.push(...errors);

    this.emitChange();
    return errors;
  }

  /**
   * Validate all visible fields.
   */
  validate(): ValidationResult {
    const allErrors: FieldError[] = [];
    const fieldErrors = new Map<FieldName, FieldError[]>();

    for (const [name, def] of this.fieldMap) {
      // Check visibility condition
      if (def.showWhen && !def.showWhen(this.state.values)) continue;
      if (def.hidden) continue;

      const errors = this.validateField(name);
      if (errors.length > 0) {
        allErrors.push(...errors);
        fieldErrors.set(name, errors);
      }
    }

    // Run step-level validator if in multi-step mode
    if (this.config.steps && this.currentStepIndex < this.config.steps.length) {
      const step = this.config.steps[this.currentStepIndex]!;
      if (step.stepValidator) {
        const stepErrors = step.stepValidator(this.state.values);
        if (stepErrors) {
          allErrors.push(...stepErrors);
          for (const err of stepErrors) {
            const existing = fieldErrors.get(err.field) ?? [];
            existing.push(err);
            fieldErrors.set(err.field, existing);
          }
        }
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      fieldErrors,
      validatedAt: Date.now(),
    };
  }

  // --- Submission ---

  /**
   * Submit the form. Validates first, then calls onSubmit handler.
   */
  async submit(): Promise<unknown> {
    if (this.destroyed || this.state.isSubmitting) return undefined;

    this.state.isSubmitted = true;
    this.state.submitCount++;
    this.touchFields(Array.from(this.fieldMap.keys()));

    const result = this.validate();

    if (!result.isValid) {
      this.config.onSubmitError?.(new Error("Form validation failed"));
      this.emitChange();

      if (this.config.scrollToError && typeof document !== "undefined") {
        const firstErrEl = document.querySelector("[data-field-error]");
        firstErrEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      if (this.config.focusFirstInvalid && result.errors.length > 0) {
        const firstField = result.errors[0]!.field;
        const el = document.querySelector(`[name="${firstField}"], [data-field="${firstField}"]`);
        (el as HTMLElement)?.focus();
      }

      return undefined;
    }

    this.state.isSubmitting = true;
    this.state.lastSubmitAt = Date.now();
    this.emitChange();

    try {
      const output = await this.config.onSubmit?.(this.state.values);

      this.state.isSubmitting = false;
      this.state.submitError = null;
      this.clearPersistence();

      this.emitChange();
      return output;
    } catch (err) {
      this.state.isSubmitting = false;
      this.state.submitError = err as Error;
      this.config.onSubmitError?.(err as Error);
      this.emitChange();
      throw err;
    }
  }

  // --- Multi-Step Navigation ---

  /**
   * Go to next step. Validates current step if configured.
   */
  async nextStep(): Promise<boolean> {
    if (!this.config.steps || this.currentStepIndex >= this.config.steps.length - 1) return false;

    const step = this.config.steps[this.currentStepIndex]!;
    if (step.skipWhen?.(this.state.values)) {
      this.currentStepIndex++;
      return await this.nextStep();
    }

    if (step.validateOnAdvance !== false) {
      const result = this.validateStep(this.currentStepIndex);
      if (!result.isValid) return false;
    }

    this.currentStepIndex++;
    this.emitChange();
    return true;
  }

  /**
   * Go to previous step.
   */
  prevStep(): boolean {
    if (this.currentStepIndex <= 0) return false;
    this.currentStepIndex--;
    this.emitChange();
    return true;
  }

  /**
   * Jump to a specific step.
   */
  goToStep(index: number): boolean {
    if (!this.config.steps || index < 0 || index >= this.config.steps.length) return false;
    this.currentStepIndex = index;
    this.emitChange();
    return true;
  }

  /**
   * Get fields for the current step.
   */
  getCurrentStepFields(): FieldDefinition[] {
    if (!this.config.steps) return Array.from(this.fieldMap.values());
    const step = this.config.steps[this.currentStepIndex];
    if (!step) return [];
    return step.fields.map((f) => this.fieldMap.get(f)!).filter(Boolean);
  }

  /**
   * Validate only the fields in a given step.
   */
  validateStep(stepIndex: number): ValidationResult {
    if (!this.config.steps) return this.validate();

    const step = this.config.steps[stepIndex];
    if (!step) return { isValid: true, errors: [], fieldErrors: new Map(), validatedAt: Date.now() };

    const errors: FieldError[] = [];
    const fieldErrors = new Map<FieldName, FieldError[]>();

    for (const field of step.fields) {
      const fe = this.validateField(field);
      if (fe.length > 0) {
        errors.push(...fe);
        fieldErrors.set(field, fe);
      }
    }

    if (step.stepValidator) {
      const se = step.stepValidator(this.state.values);
      if (se) {
        errors.push(...se);
        for (const e of se) {
          const ex = fieldErrors.get(e.field) ?? [];
          ex.push(e);
          fieldErrors.set(e.field, ex);
        }
      }
    }

    return { isValid: errors.length === 0, errors, fieldErrors, validatedAt: Date.now() };
  }

  // --- Persistence ---

  /** Save current state to localStorage */
  persist(): void {
    if (!this.config.persistKey || typeof window === "undefined") return;
    try {
      localStorage.setItem(this.config.persistKey, JSON.stringify(this.state.values));
    } catch { /* ignore quota */ }
  }

  /** Clear persisted state */
  clearPersistence(): void {
    if (this.config.persistKey && typeof window !== "undefined") {
      localStorage.removeItem(this.config.persistKey);
    }
  }

  // --- Events ---

  subscribe(listener: (state: FormState<TValues>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Lifecycle ---

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    for (const timer of this.debounceTimers.values()) clearTimeout(timer);
    this.debounceTimers.clear();

    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);

    if (this.config.confirmUnsavedChanges && typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.handleBeforeUnload);
    }

    this.clearPersistence();
    this.listeners.clear();
  }

  // --- Internal ---

  private emitChange(): void {
    this.config.onChange?.(this.getState());
    for (const l of this.listeners) l(this.getState());
  }

  private debouncedValidate(field: FieldName): void {
    const existing = this.debounceTimers.get(field);
    if (existing) clearTimeout(existing);

    const def = this.fieldMap.get(field);
    const debounceMs = def?.rules?.find((r) => r.debounceMs)?.debounceMs
      ?? this.config.validationDebounceMs;

    this.debounceTimers.set(
      field,
      setTimeout(() => {
        this.validateField(field);
        this.debounceTimers.delete(field);
      }, debounceMs),
    );
  }

  private handleBeforeUnload = (e: BeforeUnloadEvent): void => {
    if (this.isDirty()) {
      e.preventDefault();
      e.returnValue = "";
    }
  };
}

// --- Factory ---

export function createFormEngine<TValues = Record<string, unknown>>(
  config: FormConfig<TValues>,
): FormEngine<TValues> {
  return new FormEngine(config);
}
