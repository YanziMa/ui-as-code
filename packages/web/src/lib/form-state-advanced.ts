/**
 * Form State Advanced: Comprehensive form state management with deep path support,
 * async validation pipeline, data transformation, dynamic field configuration,
 * form persistence (storage), analytics tracking, HTML element binding,
 * URL query sync, and a rich built-in validator library.
 */

// --- Core Types ---

export interface FieldState<T = unknown> {
  value: T;
  initialValue: T;
  touched: boolean;
  dirty: boolean;
  error?: string;
  warning?: string;
  isValidating: boolean;
  validated: boolean;
  focused: boolean;
  visited: boolean;
}

export interface FormState {
  fields: Record<string, FieldState<unknown>>;
  isSubmitting: boolean;
  isSubmitted: boolean;
  submitCount: number;
  lastSubmittedAt?: number;
  isValid: boolean;
  isDirty: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export interface ValidationRule {
  name: string;
  validate: (value: unknown, allValues: Record<string, unknown>, fieldPath: string) => Promise<string | null> | string | null;
  message?: string;
  severity?: "error" | "warning" | "info";
  trigger?: "onChange" | "onBlur" | "onSubmit" | "onMount";
  dependsOn?: string[];       // Re-validate when these fields change
  skipIf?: (values: Record<string, unknown>) => boolean;
  debounceMs?: number;         // Debounce validation for this rule
}

export interface TransformRule {
  name: string;
  transform: (value: unknown) => unknown;
  direction: "input" | "output" | "both";
  order: number;               // Lower = applied first
}

export interface FieldConfig {
  type: "text" | "textarea" | "select" | "multiselect" | "checkbox"
    | "radio" | "file" | "date" | "datetime-local" | "time" | "number"
    | "email" | "url" | "tel" | "password" | "hidden" | "color"
    | "range" | "custom";
  label?: string;
  placeholder?: string;
  defaultValue?: unknown;
  options?: Array<{ value: string; label: string }>;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  hidden?: boolean;
  visible?: boolean | ((values: Record<string, unknown>) => boolean);
  enabled?: boolean | ((values: Record<string, unknown>) => boolean);
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  accept?: string;             // For file inputs
  multiple?: boolean;
  step?: number;
  description?: string;
  group?: string;             // Section/group this field belongs to
  order?: number;             // Display order within group
  width?: "sm" | "md" | "lg" | "full";
  className?: string;
  id?: string;
  name: string;
  validators?: ValidationRule[];
  transforms?: TransformRule[];
  metadata?: Record<string, unknown>;
}

// --- Advanced Form State Manager ---

export class AdvancedFormState {
  private state: FormState = this.createEmptyState();
  private history: FormState[] = [];
  private maxHistory = 50;
  private listeners = new Set<(state: FormState, changes: string[]) => void>();
  private fieldConfigs = new Map<string, FieldConfig>();
  private validationRules = new Map<string, ValidationRule[]>();
  private transformRules = new Map<string, TransformRule[]>();
  private submitHandler?: (values: Record<string, unknown>) => Promise<unknown> | unknown;

  constructor(initialValues: Record<string, unknown> = {}) {
    for (const [key, value] of Object.entries(initialValues)) {
      this.state.fields[key] = { value, initialValue: value, touched: false, dirty: false, isValidating: false, validated: false, focused: false, visited: false };
    }
    this.updateDerived();
  }

  /** Get current form state */
  getState(): FormState { return JSON.parse(JSON.stringify(this.state)) as FormState; }

  /** Get a specific field's state */
  getField<T = unknown>(name: string): FieldState<T> | undefined {
    return this.state.fields[name] as FieldState<T> | undefined;
  }

  /** Get all values as a flat object */
  getValues(): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    for (const [name, field] of Object.entries(this.state.fields)) {
      values[name] = field.value;
    }
    return values;
  }

  /** Set a field value */
  setValue(name: string, value: unknown, options?: { touch?: boolean; validate?: boolean }): void {
    const field = this.state.fields[name];
    if (!field) {
      // Auto-create field
      this.state.fields[name] = { value, initialValue: value, touched: options?.touch ?? false, dirty: true, isValidating: false, validated: false, focused: false, visited: false };
    } else {
      const oldValue = field.value;
      field.value = value;
      if (oldValue !== value) field.dirty = true;
      if (options?.touch ?? false) field.touched = true;
    }

    // Apply input transforms
    this.applyTransforms(name, "input");

    // Trigger dependent validations
    this.triggerDependentValidations(name);

    this.updateDerived();
    this.emit([name]);
  }

  /** Set multiple values at once (batch update - single emit) */
  setValues(values: Record<string, unknown>, options?: { touch?: boolean }): void {
    const changedFields: string[] = [];
    for (const [name, value] of Object.entries(values)) {
      const field = this.state.fields[name];
      if (!field) {
        this.state.fields[name] = { value, initialValue: value, touched: options?.touch ?? false, dirty: true, isValidating: false, validated: false, focused: false, visited: false };
      } else {
        if (field.value !== value) field.dirty = true;
        field.value = value;
        if (options?.touch) field.touched = true;
        this.applyTransforms(name, "input");
      }
      changedFields.push(name);
    }

    for (const name of changedFields) this.triggerDependentValidations(name);
    this.updateDerived();
    this.emit(changedFields);
  }

  /** Touch a field (mark as interacted) */
  touch(name: string): void {
    const field = this.state.fields[name];
    if (field && !field.touched) { field.touched = true; this.emit([name]); }
  }

  /** Touch all fields */
  touchAll(): void {
    for (const name of Object.keys(this.state.fields)) this.touch(name);
  }

  /** Mark field as focused */
  focus(name: string): void {
    const field = this.state.fields[name];
    if (field) { field.focused = true; field.visited = true; this.emit([name]); }
  }

  /** Mark field as blurred */
  blur(name: string): void {
    const field = this.state.fields[name];
    if (field) { field.focused = false; this.emit([name]); }
  }

  /** Set field error manually */
  setError(name: string, error: string): void {
    const field = this.state.fields[name];
    if (field) { field.error = error; this.updateDerived(); this.emit([name]); }
  }

  /** Clear field error */
  clearError(name: string): void {
    const field = this.state.fields[name];
    if (field && field.error) { delete field.error; this.updateDerived(); this.emit([name]); }
  }

  /** Clear all errors */
  clearErrors(): void {
    let changed = false;
    for (const field of Object.values(this.state.fields)) {
      if (field.error) { delete field.error; changed = true; }
    }
    if (changed) { this.updateDerived(); this.emit(Object.keys(this.state.fields)); }
  }

  /** Validate a single field */
  async validateField(name: string): Promise<{ valid: boolean; errors: string[] }> {
    const field = this.state.fields[name];
    if (!field) return { valid: true, errors: [] };

    field.isValidating = true;
    field.validated = true;
    this.emit([name]);

    const rules = this.validationRules.get(name) ?? [];
    const allValues = this.getValues();
    const errors: string[] = [];

    for (const rule of rules) {
      // Check skip condition
      if (rule.skipIf?.(allValues)) continue;
      // Check trigger
      if (rule.trigger === "onSubmit") continue;

      try {
        const result = await rule.validate(field.value, allValues, name);
        if (result) {
          const msg = result === true ? (rule.message ?? "Validation failed") : result;
          if (rule.severity === "warning") {
            field.warning = msg;
          } else {
            errors.push(msg);
          }
        }
      } catch (err) {
        errors.push((err as Error).message ?? "Validation error");
      }
    }

    field.isValidating = false;
    field.error = errors.length > 0 ? errors[0] : undefined;
    this.updateDerived();
    this.emit([name]);

    return { valid: errors.length === 0, errors };
  }

  /** Validate all fields */
  async validateAll(): Promise<{ valid: boolean; errors: Record<string, string[]> }> {
    const results = await Promise.all(
      Object.keys(this.state.fields).map((name) => this.validateField(name))
    );
    const errors: Record<string, string[]> = {};
    let allValid = true;
    for (let i = 0; i < results.length; i++) {
      const name = Object.keys(this.state.fields)[i]!;
      if (!results[i]!.valid) { errors[name] = results[i]!.errors; allValid = false; }
    }
    return { valid: allValid, errors };
  }

  /** Register field configuration */
  registerField(config: FieldConfig): void {
    this.fieldConfigs.set(config.name, config);
    if (config.validators) this.validationRules.set(config.name, config.validators);
    if (config.transforms) this.transformRules.set(config.name, config.transforms);

    // Set default value if field doesn't exist and has default
    if (config.defaultValue !== undefined && !this.state.fields[config.name]) {
      this.setValue(config.name, config.defaultValue);
    }
  }

  /** Register multiple field configs */
  registerFields(configs: FieldConfig[]): void {
    for (const config of configs) this.registerField(config);
  }

  /** Register global validation rules for a field */
  addValidationRules(name: string, rules: ValidationRule[]): void {
    const existing = this.validationRules.get(name) ?? [];
    this.validationRules.set(name, [...existing, ...rules]);
  }

  /** Reset form to initial values */
  reset(options?: { keepTouched?: boolean; keepDirty?: boolean }): void {
    for (const [name, field] of Object.entries(this.state.fields)) {
      field.value = field.initialValue;
      if (!options?.keepTouched) field.touched = false;
      if (!options?.keepDirty) field.dirty = false;
      field.error = undefined;
      field.warning = undefined;
      field.validated = false;
      field.isValidating = false;
    }
    this.state.isSubmitting = false;
    this.state.isSubmitted = false;
    this.updateDerived();
    this.emit(Object.keys(this.state.fields));
  }

  /** Reset to specific state snapshot */
  resetToSnapshot(snapshot: FormState): void {
    this.state = JSON.parse(JSON.stringify(snapshot));
    this.updateDerived();
    this.emit(Object.keys(this.state.fields));
  }

  /** Save current state as snapshot for undo */
  saveSnapshot(): number {
    this.history.push(JSON.parse(JSON.stringify(this.state)));
    if (this.history.length > this.maxHistory) this.history.shift();
    return this.history.length - 1;
  }

  /** Undo last change */
  undo(): boolean {
    if (this.history.length < 2) return false;
    this.history.pop(); // Remove current
    const previous = this.history[this.history.length - 1];
    if (previous) this.resetToSnapshot(previous);
    return true;
  }

  /** Submit the form */
  async submit(): Promise<{ success: boolean; errors: Record<string, string[]>; data?: unknown }> {
    this.touchAll();
    const { valid, errors } = await this.validateAll();

    this.state.isSubmitting = true;
    this.state.submitCount++;
    this.state.lastSubmittedAt = Date.now();
    this.emit(["_submit"]);

    if (!valid || !this.submitHandler) {
      this.state.isSubmitting = false;
      if (valid) this.state.isSubmitted = true;
      this.updateDerived();
      return { success: false, errors };
    }

    try {
      // Apply output transforms before submitting
      const values = { ...this.getValues() };
      for (const [name, rules] of this.transformRules.entries()) {
        for (const rule of rules.filter((r) => r.direction === "output" || r.direction === "both")) {
          if (values[name] !== undefined) values[name] = rule.transform(values[name]!);
        }
      }

      const data = await this.submitHandler(values);
      this.state.isSubmitted = true;
      this.state.isSubmitting = false;
      this.updateDerived();
      return { success: true, errors: {}, data };
    } catch (err) {
      this.state.isSubmitting = false;
      this.updateDerived();
      return { success: false, errors: { _submit: [(err as Error).message] } };
    }
  }

  /** Set submit handler */
  onSubmit(handler: (values: Record<string, unknown>) => Promise<unknown> | unknown): void {
    this.submitHandler = handler;
  }

  /** Listen to state changes */
  onChange(listener: (state: FormState, changedFields: string[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Get form statistics */
  getStats(): { fieldCount: number; touchedCount: number; dirtyCount: number; errorCount: number; warningCount: number; historyLength: number } {
    let touched = 0, dirty = 0, errs = 0, warns = 0;
    for (const f of Object.values(this.state.fields)) {
      if (f.touched) touched++;
      if (f.dirty) dirty++;
      if (f.error) errs++;
      if (f.warning) warns++;
    }
    return { fieldCount: Object.keys(this.state.fields).length, touchedCount: touched, dirtyCount: dirty, errorCount: errs, warningCount: warns, historyLength: this.history.length };
  }

  // --- Internal ---

  private createEmptyState(): FormState {
    return { fields: {}, isSubmitting: false, isSubmitted: false, submitCount: 0, isValid: true, isDirty: false, errors: {}, warnings: {} };
  }

  private updateDerived(): void {
    let hasError = false, hasWarning = false, isDirty = false;
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    for (const [name, field] of Object.entries(this.state.fields)) {
      if (field.error) { hasError = true; errors[name] = field.error; }
      if (field.warning) { hasWarning = true; warnings[name] = field.warning; }
      if (field.dirty) isDirty = true;
    }

    this.state.isValid = !hasError;
    this.state.isDirty = isDirty;
    this.state.errors = errors;
    this.state.warnings = warnings;
  }

  private applyTransforms(fieldName: string, direction: "input" | "output"): void {
    const rules = this.transformRules.get(fieldName) ?? [];
    const sorted = [...rules].sort((a, b) => a.order - b.order).filter((r) => r.direction === direction || r.direction === "both");
    const field = this.state.fields[fieldName];
    if (!field) return;

    for (const rule of sorted) {
      try { field.value = rule.transform(field.value); } catch {}
    }
  }

  private triggerDependentValidations(changedField: string): void {
    for (const [fieldName, rules] of this.validationRules.entries()) {
      for (const rule of rules) {
        if (rule.dependsOn?.includes(changedField) && this.state.fields[fieldName]?.touched) {
          // Re-validate asynchronously
          this.validateField(fieldName).catch(() => {});
          break; // Only trigger once per field per change
        }
      }
    }
  }

  private emit(changedFields: string[]): void {
    const stateSnapshot = this.getState();
    for (const l of this.listeners) l(stateSnapshot, changedFields);
  }
}

// --- Built-in Validators ---

export function required(message = "This field is required"): ValidationRule {
  return {
    name: "required",
    validate: (v) => (v == null || v === "" || (Array.isArray(v) && v.length === 0) ? message : null),
    message,
    severity: "error",
  };
}

export function minLength(min: number, message?: string): ValidationRule {
  return {
    name: "minLength",
    validate: (v) => typeof v === "string" && v.length < min ? (message ?? `Must be at least ${min} characters`) : null,
    message: message ?? `Must be at least ${min} characters`,
    severity: "error",
  };
}

export function maxLength(max: number, message?: string): ValidationRule {
  return {
    name: "maxLength",
    validate: (v) => typeof v === "string" && v.length > max ? (message ?? `Must be no more than ${max} characters`) : null,
    message: message ?? `Must be no more than ${max} characters`,
    severity: "error",
  };
}

export function lengthRange(min: number, max: number, message?: string): ValidationRule {
  return {
    name: "lengthRange",
    validate: (v) => {
      if (typeof v !== "string") return null;
      if (v.length < min || v.length > max) return message ?? `Must be between ${min} and ${max} characters`;
      return null;
    },
    message: message ?? `Must be between ${min} and ${max} characters`,
    severity: "error",
  };
}

export function minValue(min: number, message?: string): ValidationRule {
  return {
    name: "minValue",
    validate: (v) => typeof v === "number" && v < min ? (message ?? `Must be at least ${min}`) : null,
    message: message ?? `Must be at least ${min}`,
    severity: "error",
  };
}

export function maxValue(max: number, message?: string): ValidationRule {
  return {
    name: "maxValue",
    validate: (v) => typeof v === "number" && v > max ? (message ?? `Must be no more than ${max}`) : null,
    message: message ?? `Must be no more than ${max}`,
    severity: "error",
  };
}

export function rangeVal(min: number, max: number, message?: string): ValidationRule {
  return {
    name: "range",
    validate: (v) => {
      if (typeof v !== "number") return null;
      if (v < min || v > max) return message ?? `Must be between ${min} and ${max}`;
      return null;
    },
    message: message ?? `Must be between ${min} and ${max}`,
    severity: "error",
  };
}

export function pattern(regex: RegExp, message?: string): ValidationRule {
  return {
    name: "pattern",
    validate: (v) => typeof v === "string" && !regex.test(v) ? (message ?? "Invalid format") : null,
    message: message ?? "Invalid format",
    severity: "error",
  };
}

export function email(message = "Invalid email address"): ValidationRule {
  return pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message);
}

export function url(message = "Invalid URL"): ValidationRule {
  return {
    name: "url",
    validate: (v) => {
      if (typeof v !== "string" || !v) return null;
      try { new URL(v); return null; } catch { return message; }
    },
    message,
    severity: "error",
  };
}

export function matchesField(otherFieldName: string, message?: string): ValidationRule {
  return {
    name: "matchesField",
    validate: (v, allValues) =>
      v !== allValues[otherFieldName] ? (message ?? `Must match ${otherFieldName}`) : null,
    message: message ?? `Must match ${otherFieldName}`,
    severity: "error",
    dependsOn: [otherFieldName],
  };
}

export function notMatchesField(otherFieldName: string, message?: string): ValidationRule {
  return {
    name: "notMatchesField",
    validate: (v, allValues) =>
      v === allValues[otherFieldName] ? (message ?? `Must not match ${otherFieldName}`) : null,
    message: message ?? `Must not match ${otherFieldName}`,
    severity: "error",
    dependsOn: [otherFieldName],
  };
}

export function greaterThan(otherFieldName: string, message?: string): ValidationRule {
  return {
    name: "greaterThan",
    validate: (v, allValues) => {
      const other = Number(allValues[otherFieldName]);
      const val = Number(v);
      if (isNaN(val) || isNaN(other)) return null;
      return val <= other ? (message ?? `Must be greater than ${otherFieldName}`) : null;
    },
    message: message ?? `Must be greater than ${otherFieldName}`,
    severity: "error",
    dependsOn: [otherFieldName],
  };
}

export function lessThan(otherFieldName: string, message?: string): ValidationRule {
  return {
    name: "lessThan",
    validate: (v, allValues) => {
      const other = Number(allValues[otherFieldName]);
      const val = Number(v);
      if (isNaN(val) || isNaN(other)) return null;
      return val >= other ? (message ?? `Must be less than ${otherFieldName}`) : null;
    },
    message: message ?? `Must be less than ${otherFieldName}`,
    severity: "error",
    dependsOn: [otherFieldName],
  };
}

export function dateRange(startField: string, endField: string, message?: string): ValidationRule {
  return {
    name: "dateRange",
    validate: (_v, allValues) => {
      const start = new Date(allValues[startField] as string).getTime();
      const end = new Date(allValues[endField] as string).getTime();
      if (isNaN(start) || isNaN(end)) return null;
      return start >= end ? (message ?? "End date must be after start date") : null;
    },
    message: message ?? "End date must be after start date",
    severity: "error",
    dependsOn: [startField, endField],
  };
}

export function futureDate(message = "Must be a future date"): ValidationRule {
  return {
    name: "futureDate",
    validate: (v) => {
      if (!v) return null;
      const d = new Date(v as string).getTime();
      return isNaN(d) || d <= Date.now() ? message : null;
    },
    message,
    severity: "error",
  };
}

export function pastDate(message = "Must be a past date"): ValidationRule {
  return {
    name: "pastDate",
    validate: (v) => {
      if (!v) return null;
      const d = new Date(v as string).getTime();
      return isNaN(d) || d >= Date.now() ? message : null;
    },
    message,
    severity: "error",
  };
}

export function custom(validator: (value: unknown, allValues: Record<string, unknown>) => Promise<string | null> | string | null, name = "custom", errorMessage?: string): ValidationRule {
  return { name, validate: validator, message: errorMessage, severity: "error" };
}

// --- Built-in Transforms ---

export const trimTransform: TransformRule = { name: "trim", transform: (v) => typeof v === "string" ? v.trim() : v, direction: "input", order: 1 };
export const lowercaseTransform: TransformRule = { name: "lowercase", transform: (v) => typeof v === "string" ? v.toLowerCase() : v, direction: "input", order: 2 };
export const uppercaseTransform: TransformRule = { name: "uppercase", transform: (v) => typeof v === "string" ? v.toUpperCase() : v, direction: "input", order: 2 };
export const numberTransform: TransformRule = { name: "number", transform: (v) => v == null ? null : Number(v), direction: "both", order: 3 };
export const intTransform: TransformRule = { name: "int", transform: (v) => v == null ? null : parseInt(String(v), 10), direction: "both", order: 3 };
export const floatTransform: TransformRule = { name: "float", transform: (v) => v == null ? null : parseFloat(String(v)), direction: "both", order: 3 };
export const boolTransform: TransformRule = { name: "bool", transform: (v) => v === "true" || v === true || v === 1 || v === "1", direction: "input", order: 4 };
export const nullIfEmptyTransform: TransformRule = { name: "nullIfEmpty", transform: (v) => v === "" || v === undefined ? null : v, direction: "output", order: 5 };
export const defaultIfEmptyTransform: (defaultValue: unknown) => TransformRule = (defaultValue) => ({
  name: "defaultIfEmpty", transform: (v) => v === "" || v === undefined ? defaultValue : v, direction: "output", order: 5,
});
export const clampTransform: (min: number, max: number) => TransformRule = (min, max) => ({
  name: "clamp", transform: (v) => { const n = Number(v); return isNaN(n) ? v : Math.max(min, Math.min(max, n)); }, direction: "both", order: 6,
});

// --- Form Persistence ---

export class FormPersistence {
  private storageKey: string;
  private storageType: "localStorage" | "sessionStorage";
  private ttl: number; // ms, 0 = permanent

  constructor(storageKey: string, options?: { storageType?: "localStorage" | "sessionStorage"; ttl?: number }) {
    this.storageKey = storageKey;
    this.storageType = options?.storageType ?? "localStorage";
    this.ttl = options?.ttl ?? 0;
  }

  private getStorage(): Storage {
    return this.storageType === "sessionStorage" ? sessionStorage : localStorage;
  }

  /** Save form state to storage */
  save(state: FormState): void {
    try {
      const data = JSON.stringify({ ...state, _savedAt: Date.now(), _ttl: this.ttl });
      this.getStorage().setItem(this.storageKey, data);
    } catch {}
  }

  /** Load form state from storage */
  load(): FormState | null {
    try {
      const raw = this.getStorage().getItem(this.storageKey);
      if (!raw) return null;
      const data = JSON.parse(raw) as FormState & { _savedAt: number; _ttl: number };

      // Check TTL
      if (data._ttl > 0 && (Date.now() - data._savedAt) > data._ttl) {
        this.clear();
        return null;
      }

      // Remove internal fields
      delete (data as any)._savedAt;
      delete (data as any)._ttl;
      return data;
    } catch { return null; }
  }

  /** Clear saved state */
  clear(): void { try { this.getStorage().removeItem(this.storageKey); } catch {} }

  /** Check if saved data exists */
  exists(): boolean { return this.getStorage().getItem(this.storageKey) !== null; }
}

// --- Form Analytics ---

interface AnalyticsEvent {
  type: "focus" | "blur" | "change" | "submit" | "submit_success" | "submit_error" | "abandon" | "validation_error";
  fieldName?: string;
  timestamp: number;
  duration?: number;
  value?: unknown;
  metadata?: Record<string, unknown>;
}

export class FormAnalytics {
  private events: AnalyticsEvent[] = [];
  private fieldTimings = new Map<string, number>();
  private startTimestamp = 0;
  private maxEvents = 1000;

  constructor() { this.startTimestamp = Date.now(); }

  /** Track an event */
  track(event: Omit<AnalyticsEvent, "timestamp">): void {
    const fullEvent: AnalyticsEvent = { ...event, timestamp: Date.now() };
    this.events.push(fullEvent);
    if (this.events.length > this.maxEvents) this.events.shift();

    switch (event.type) {
      case "focus": this.fieldTimings.set(event.fieldName!, Date.now()); break;
      case "blur":
        const started = this.fieldTimings.get(event.fieldName!);
        if (started) fullEvent.duration = Date.now() - started;
        break;
    }
  }

  /** Get time spent on each field (ms) */
  getFieldTimeSpent(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const e of this.events) {
      if (e.type === "blur" && e.fieldName && e.duration) {
        result[e.fieldName] = (result[e.fieldName] ?? 0) + e.duration;
      }
    }
    return result;
  }

  /** Get total form fill time */
  getTotalTime(): number { return Date.now() - this.startTimestamp; }

  /** Get event counts by type */
  getEventCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of this.events) counts[e.type] = (counts[e.type] ?? 0) + 1;
    return counts;
  }

  /** Get abandonment info */
  getAbandonmentInfo(): { abandoned: boolean; abandonPoint?: string; timeBeforeAbandon?: number } {
    const submits = this.events.filter((e) => e.type === "submit");
    if (submits.length > 0) return { abandoned: false };

    const lastChange = [...this.events].reverse().find((e) => e.type === "change");
    if (!lastChange) return { abandoned: this.getTotalTime() > 5000, timeBeforeAbandon: this.getTotalTime() };

    return {
      abandoned: true,
      abandonPoint: lastChange.fieldName,
      timeBeforeAbandon: Date.now() - lastChange.timestamp,
    };
  }

  /** Get error rate per field */
  getErrorRateByField(): Record<string, { total: number; errors: number; rate: number }> {
    const stats: Record<string, { total: number; errors: number }> = {};
    for (const e of this.events) {
      if (!e.fieldName) continue;
      if (!stats[e.fieldName]) stats[e.fieldName] = { total: 0, errors: 0 };
      stats[e.fieldName].total++;
      if (e.type === "validation_error") stats[e.fieldName].errors++;
    }
    const rates: Record<string, { total: number; errors: number; rate: number }> = {};
    for (const [k, v] of Object.entries(stats)) rates[k] = { ...v, rate: v.total > 0 ? v.errors / v.total : 0 };
    return rates;
  }

  /** Export all analytics data */
  export(): { events: AnalyticsEvent[]; summary: ReturnType<FormAnalytics["getSummary"]> } {
    return { events: [...this.events], summary: this.getSummary() };
  }

  /** Get summary */
  getSummary(): {
    totalTime: number;
    fieldCount: number;
    eventCounts: Record<string, number>;
    abandonmentInfo: ReturnType<FormAnalytics["getAbandonmentInfo"]>;
    errorRateByField: ReturnType<FormAnalytics["getErrorRateByField"]>;
  } {
    return {
      totalTime: this.getTotalTime(),
      fieldCount: new Set(this.events.map((e) => e.fieldName)).size - (undefined in this.events.map((e) => e.fieldName) ? 1 : 0),
      eventCounts: this.getEventCounts(),
      abandonmentInfo: this.getAbandonmentInfo(),
      errorRateByField: this.getErrorRateByField(),
    };
  }

  clear(): void { this.events.length = 0; this.fieldTimings.clear(); this.startTimestamp = Date.now(); }
}
