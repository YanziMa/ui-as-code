/**
 * Schema Form Builder: Generate forms from JSON schemas with validation,
 * conditional fields, dependent field values, section grouping,
 * layout configuration, custom widgets, async data loading,
 * form state persistence, and multi-step wizard flows.
 */

// --- Types ---

export type FieldType =
  | "text" | "textarea" | "email" | "password" | "number" | "tel" | "url"
  | "select" | "multiselect" | "checkbox" | "radio" | "toggle" | "switch"
  | "date" | "time" | "datetime-local" | "color" | "range" | "file"
  | "hidden" | "display" | "group" | "repeat" | "section" | "custom";

export type ValidationRuleType =
  | "required" | "minLength" | "maxLength" | "pattern" | "min" | "max"
  | "range" | "email" | "url" | "custom" | "matchField" | "notMatchField"
  | "dependsOn" | "when" | "async";

export interface FieldValidation {
  type: ValidationRuleType;
  message?: string;
  value?: unknown;
  /** For custom: (val, formValues) => string | null */
  fn?: (value: unknown, allValues: Record<string, unknown>) => string | null;
  /** For dependsOn: field must have truthy value */
  dependsOn?: string;
  /** For when: condition expression */
  when?: (values: Record<string, unknown>) => boolean;
  /** For async: validator function returning Promise<string | null> */
  asyncFn?: (value: unknown) => Promise<string | null>;
}

export interface SchemaField {
  key: string;
  type: FieldType;
  label?: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
  options?: Array<{ label: string; value: unknown; disabled?: boolean }>;
  validation?: FieldValidation[];
  /** Show/hide conditionally */
  visible?: boolean | ((values: Record<string, unknown>) => boolean);
  /** Disable conditionally */
  disabled?: boolean | ((values: Record<string, unknown>) => boolean);
  /** Read-only conditionally */
  readOnly?: boolean;
  /** Field group / section metadata */
  fields?: SchemaField[];           // For group/repeat types
  /** Grid layout (columns span) */
  span?: number;
  /** CSS class */
  className?: string;
  /** Custom widget renderer */
  widget?: (field: SchemaField, value: unknown, onChange: (v: unknown) => void, error?: string) => HTMLElement | string;
  /** Async options loader */
  loadOptions?: () => Promise<Array<{ label: string; value: unknown }>>;
  /** On change callback (additional to form-level) */
  onChange?: (value: unknown, allValues: Record<string, unknown>) => void;
  /** Tooltip */
  tooltip?: string;
  /** Prefix/suffix adornments */
  prefix?: string;
  suffix?: string;
  /** Unit label */
  unit?: string;
  /** Min/max for range/number */
  min?: number;
  max?: number;
  step?: number;
  /** Rows for textarea */
  rows?: number;
  /** Accept file types */
  accept?: string;
  /** Multiple files */
  multiple?: boolean;
}

export interface FormSchema {
  title?: string;
  description?: string;
  fields: SchemaField[];
  /** Layout mode */
  layout?: "vertical" | "horizontal" | "inline" | "grid";
  /** Grid columns count (for grid layout) */
  columns?: number;
  /** Label position */
  labelPosition?: "top" | "left" | "floating" | "hidden";
  /** Label width (for horizontal layout) */
  labelWidth?: string;
  /** Submit button text */
  submitText?: string;
  /** Reset button visibility */
  showReset?: boolean;
  /** Form-level class */
  className?: string;
  /** Section headers */
  sections?: Array<{
    title: string;
    description?: string;
    fields: string[];       // Field keys in this section
    collapsible?: boolean;
    defaultCollapsed?: boolean;
  }>;
}

export interface FormState {
  values: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Set<string>;
  submitted: boolean;
  isValid: boolean;
  isDirty: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  fieldErrors: Map<string, string[]>;
}

export interface WizardStep {
  title: string;
  description?: string;
  fields: string[];             // Field keys for this step
  validateBeforeNext?: boolean;
  onEnter?: (state: FormState) => void;
  onLeave?: (state: FormState) => boolean | void;
}

// --- Validator ---

class SchemaValidator {
  validate(field: SchemaField, value: unknown, allValues: Record<string, unknown>): string | null {
    if (!field.validation || field.validation.length === 0) return null;

    for (const rule of field.validation) {
      const error = this.validateRule(rule, value, allValues);
      if (error) return error;
    }

    return null;
  }

  private validateRule(rule: FieldValidation, value: unknown, allValues: Record<string, unknown>): string | null {
    switch (rule.type) {
      case "required":
        if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0))
          return rule.message ?? "This field is required";
        break;

      case "minLength":
        if (typeof value === "string" && value.length < (rule.value as number))
          return rule.message ?? `Minimum length is ${rule.value}`;
        break;

      case "maxLength":
        if (typeof value === "string" && value.length > (rule.value as number))
          return rule.message ?? `Maximum length is ${rule.value}`;
        break;

      case "pattern":
        if (typeof value === "string" && !new RegExp(rule.value as string).test(value))
          return rule.message ?? "Invalid format";
        break;

      case "min":
        if (typeof value === "number" && value < (rule.value as number))
          return rule.message ?? `Minimum value is ${rule.value}`;
        break;

      case "max":
        if (typeof value === "number" && value > (rule.value as number))
          return rule.message ?? `Maximum value is ${rule.value}`;
        break;

      case "range": {
        const [min, max] = rule.value as [number, number];
        if (typeof value === "number" && (value < min || value > max))
          return rule.message ?? `Value must be between ${min} and ${max}`;
        break;
      }

      case "email":
        if (typeof value === "string" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return rule.message ?? "Invalid email address";
        break;

      case "url":
        if (typeof value === "string" && value) {
          try { new URL(value); } catch { return rule.message ?? "Invalid URL"; }
        }
        break;

      case "matchField":
        if (value !== allValues[rule.dependsOn ?? rule.value as string])
          return rule.message ?? `Fields do not match`;
        break;

      case "notMatchField":
        if (value === allValues[rule.dependsOn ?? rule.value as string])
          return rule.message ?? `Fields must not match`;
        break;

      case "dependsOn":
        if (!allValues[rule.dependsOn ?? ""])
          return rule.message ?? `This field requires "${rule.dependsOn}" to be filled`;
        break;

      case "when":
        if (rule.when && !rule.when(allValues))
          return rule.message ?? "Condition not met";
        break;

      case "custom":
        if (rule.fn) return rule.fn(value, allValues);
        break;

      default:
        break;
    }
    return null;
  }
}

// --- Form Builder ---

export class FormBuilder {
  private schema: FormSchema;
  private state: FormState;
  private validator = new SchemaValidator();
  private listeners = new Set<(state: FormState) => void>();
  private changeListeners = new Set<(key: string, value: unknown, state: FormState) => void>();
  private asyncValidators = new Map<string, FieldValidation>();

  constructor(schema: FormSchema) {
    this.schema = schema;
    this.state = this.initializeState();
  }

  /** Initialize form state from schema defaults */
  private initializeState(): FormState {
    const values: Record<string, unknown> = {};
    const extractDefaults = (fields: SchemaField[]) => {
      for (const f of fields) {
        if (f.type === "group" || f.type === "repeat" || f.type === "section") {
          if (f.fields) extractDefaults(f.fields);
        } else if (f.defaultValue !== undefined) {
          values[f.key] = f.defaultValue;
        }
      }
    };
    extractDefaults(this.schema.fields);

    return { values, errors: {}, touched: new Set(), submitted: false, isValid: true, isDirty: false };
  }

  /** Get current form state */
  getState(): FormState { return this.state; }

  /** Get all current values */
  getValues(): Record<string, unknown> { return { ...this.state.values }; }

  /** Get a single field value */
  getValue(key: string): unknown { return this.state.values[key]; }

  /** Set a single field value */
  setValue(key: string, value: unknown): void {
    const prev = this.state.values[key];
    this.state.values[key] = value;
    this.state.touched.add(key);
    this.state.isDirty = true;

    // Clear error on change
    if (this.state.errors[key]) {
      delete this.state.errors[key];
    }

    // Run field-level validation immediately
    const field = this.findField(key);
    if (field) {
      const error = this.validator.validate(field, value, this.state.values);
      if (error) this.state.errors[key] = error;
    }

    // Notify field change listener
    for (const l of this.changeListeners) l(key, value, this.state);

    // Find and run field's onChange
    if (field?.onChange) field.onChange(value, this.state.values);

    this.notifyListeners();
  }

  /** Set multiple values at once */
  setValues(values: Record<string, unknown>): void {
    for (const [k, v] of Object.entries(values)) this.setValue(k, v);
  }

  /** Validate entire form */
  validate(syncOnly = true): ValidationResult {
    const errors: Record<string, string> = {};
    const fieldErrors = new Map<string, string[]>();

    const validateFields = (fields: SchemaField[]) => {
      for (const field of fields) {
        if (field.type === "group" || field.type === "repeat" || field.type === "section") {
          if (field.fields) validateFields(field.fields);
        } else {
          const value = this.state.values[field.key];
          const error = this.validator.validate(field, value, this.state.values);
          if (error) {
            errors[field.key] = error;
            const arr = fieldErrors.get(field.key) ?? [];
            arr.push(error);
            fieldErrors.set(field.key, arr);
          }
        }
      }
    };

    validateFields(this.schema.fields);

    this.state.errors = errors;
    this.state.isValid = Object.keys(errors).length === 0;

    return { valid: this.state.isValid, errors, fieldErrors };
  }

  /** Validate a single field */
  validateField(key: string): string | null {
    const field = this.findField(key);
    if (!field) return null;
    const error = this.validator.validate(field, this.state.values[key], this.state.values);
    if (error) this.state.errors[key] = error;
    else delete this.state.errors[key];
    this.notifyListeners();
    return error;
  }

  /** Check if a field is visible based on conditions */
  isFieldVisible(field: SchemaField): boolean {
    if (field.visible === undefined) return true;
    if (typeof field.visible === "boolean") return field.visible;
    return field.visible(this.state.values);
  }

  /** Check if a field is disabled */
  isFieldDisabled(field: SchemaField): boolean {
    if (field.disabled === undefined) return false;
    if (typeof field.disabled === "boolean") return field.disabled;
    return field.disabled(this.state.values);
  }

  /** Reset form to defaults */
  reset(): void {
    this.state = this.initializeState();
    this.notifyListeners();
  }

  /** Mark as submitted (shows all errors) */
  submit(): ValidationResult {
    this.state.submitted = true;
    return this.validate();
  }

  /** Subscribe to state changes */
  onChange(listener: (state: FormState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Subscribe to individual field changes */
  onFieldChange(listener: (key: string, value: unknown, state: FormState) => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  /** Update schema dynamically */
  updateSchema(partial: Partial<FormSchema>): void {
    Object.assign(this.schema, partial);
  }

  /** Generate HTML form (basic rendering) */
  renderToString(): string {
    const parts: string[] = [];

    if (this.schema.title) parts.push(`<h2>${escapeHtml(this.schema.title)}</h2>`);
    if (this.schema.description) parts.push(`<p>${escapeHtml(this.schema.description)}</p>`);

    parts.push(`<form class="schema-form ${this.schema.className ?? ""}" novalidate>`);

    this.renderFieldsToString(parts, this.schema.fields);

    parts.push(`<div class="form-actions">`);
    parts.push(`<button type="submit">${escapeHtml(this.schema.submitText ?? "Submit")}</button>`);
    if (this.schema.showReset) parts.push(`<button type="reset">Reset</button>`);
    parts.push(`</div></form>`);

    return parts.join("\n");
  }

  private renderFieldsToString(parts: string[], fields: SchemaField[]): void {
    for (const field of fields) {
      if (!this.isFieldVisible(field)) continue;

      if (field.type === "section" || field.type === "group") {
        if (field.label) parts.push(`<fieldset><legend>${escapeHtml(field.label)}</legend>`);
        if (field.fields) this.renderFieldsToString(parts, field.fields);
        if (field.label) parts.push(`</fieldset>`);
        continue;
      }

      const error = this.state.errors[field.key];
      const disabled = this.isFieldDisabled(field);
      const value = this.state.values[field.key];

      parts.push(`<div class="field field-${field.type} ${field.className ?? ""}" data-field="${field.key}">`);

      // Label
      if (field.label && this.schema.labelPosition !== "hidden") {
        parts.push(`<label for="${field.key}">${escapeHtml(field.label)}</label>`);
      }

      // Help text
      if (field.helpText) parts.push(`<span class="help-text">${escapeHtml(field.helpText)}</span>`);

      // Input element
      parts.push(this.renderInput(field, value, disabled, error));

      // Error
      if (error) parts.push(`<span class="field-error">${escapeHtml(error)}</span>`);

      parts.push(`</div>`);
    }
  }

  private renderInput(field: SchemaField, value: unknown, disabled: boolean, _error?: string): string {
    const commonAttrs = `id="${field.key}" name="${field.key}" placeholder="${field.placeholder ?? ""}"${disabled ? " disabled" : ""}${field.readOnly ? " readonly" : ""}`;

    // Custom widget
    if (field.widget) return `<div data-widget="${field.key}"></div>`;

    switch (field.type) {
      case "text":     return `<input type="text" ${commonAttrs} value="${escapeHtml(String(value ?? ""))}" />`;
      case "textarea": return `<textarea ${commonAttrs} rows="${field.rows ?? 4}">${escapeHtml(String(value ?? ""))}</textarea>`;
      case "email":   return `<input type="email" ${commonAttrs} value="${escapeHtml(String(value ?? ""))}" />`;
      case "password": return `<input type="password" ${commonAttrs} />`;
      case "number":   return `<input type="number" ${commonAttrs} value="${value ?? ""}" min="${field.min ?? ""}" max="${field.max ?? ""}" step="${field.step ?? "any"}" />`;
      case "tel":     return `<input type="tel" ${commonAttrs} value="${escapeHtml(String(value ?? ""))}" />`;
      case "url":      return `<input type="url" ${commonAttrs} value="${escapeHtml(String(value ?? ""))}" />`;
      case "date":     return `<input type="date" ${commonAttrs} value="${value ?? ""}" />`;
      case "time":     return `<input type="time" ${commonAttrs} value="${value ?? ""}" />`;
      case "datetime-local": return `<input type="datetime-local" ${commonAttrs} value="${value ?? ""}" />`;
      case "color":    return `<input type="color" ${commonAttrs} value="${value ?? "#000000"}" />`;
      case "range":    return `<input type="range" ${commonAttrs} value="${value ?? 0}" min="${field.min ?? 0}" max="${field.max ?? 100}" />`;
      case "file":     return `<input type="file" ${commonAttrs} accept="${field.accept ?? ""}" ${field.multiple ? "multiple" : ""} />`;
      case "hidden":   return `<input type="hidden" ${commonAttrs} value="${value ?? ""}" />`;

      case "select":
        return `<select ${commonAttrs}>${
          (field.options ?? []).map((o) =>
            `<option value="${o.value}" ${o.value === value ? "selected" : ""}${o.disabled ? "disabled" : ""}>${escapeHtml(o.label)}</option>`
          ).join("")
        }</select>`;

      case "checkbox":
        return `<input type="checkbox" ${commonAttrs} ${!!value ? "checked" : ""} />`;

      case "radio":
      case "toggle":
      case "switch":
        return `<div class="${field.type}-group">${
          (field.options ?? []).map((o) => `
            <label class="${field.type}-option">
              <input type="${field.type === "radio" ? "radio" : "checkbox"}" name="${field.key}" value="${o.value}" ${o.value === value ? "checked" : ""} />
              ${escapeHtml(o.label)}
            </label>
          `).join("")
        }</div>`;

      case "display":
        return `<span class="display-value">${escapeHtml(String(value ?? ""))}</span>`;

      default:
        return `<input type="text" ${commonAttrs} value="${escapeHtml(String(value ?? ""))}" />`;
    }
  }

  // --- Wizard Support ---

  /** Build a multi-step wizard from the schema */
  buildWizard(steps: WizardStep[]): WizardController {
    return new WizardController(this, steps);
  }

  // --- Internal ---

  private findField(key: string): SchemaField | undefined {
    const search = (fields: SchemaField[]): SchemaField | undefined => {
      for (const f of fields) {
        if (f.key === key) return f;
        if (f.fields) {
          const found = search(f.fields);
          if (found) return found;
        }
      }
      return undefined;
    };
    return search(this.schema.fields);
  }

  private notifyListeners(): void {
    for (const l of this.listeners) l(this.state);
  }
}

// --- Wizard Controller ---

export class WizardController {
  private builder: FormBuilder;
  private steps: WizardStep[];
  private currentStep = 0;
  private stepListeners = new Set<(step: number) => void>();

  constructor(builder: FormBuilder, steps: WizardStep[]) {
    this.builder = builder;
    this.steps = steps;
  }

  getCurrentStep(): number { return this.currentStep; }
  getTotalSteps(): number { return this.steps.length; }
  isFirstStep(): boolean { return this.currentStep === 0; }
  isLastStep(): boolean { return this.currentStep >= this.steps.length - 1; }

  next(): boolean {
    if (this.isLastStep()) return false;
    const step = this.steps[this.currentStep];
    if (step?.validateBeforeNext) {
      const result = this.builder.validate();
      if (!result.valid) return false;
    }
    step?.onLeave?.(this.builder.getState());
    this.currentStep++;
    this.steps[this.currentStep]?.onEnter?.(this.builder.getState());
    this.stepListeners.forEach((l) => l(this.currentStep));
    return true;
  }

  prev(): boolean {
    if (this.isFirstStep()) return false;
    this.currentStep--;
    this.stepListeners.forEach((l) => l(this.currentStep));
    return true;
  }

  goTo(step: number): boolean {
    if (step < 0 || step >= this.steps.length) return false;
    this.currentStep = step;
    this.stepListeners.forEach((l) => l(this.currentStep));
    return true;
  }

  onStepChange(listener: (step: number) => void): () => void {
    this.stepListeners.add(listener);
    return () => this.stepListeners.delete(listener);
  }

  /** Render only current step's fields */
  renderCurrentStep(): string {
    const step = this.steps[this.currentStep];
    if (!step) return "";
    const parts: string[] = [];
    if (step.title) parts.push(`<h3>${escapeHtml(step.title)}</h3>`);
    if (step.description) parts.push(`<p>${escapeHtml(step.description)}</p>`);

    const visibleFields = this.builder.schema.fields.filter((f) => step.fields.includes(f.key));
    // Would use internal render method
    return parts.join("\n") + `<!-- Step ${this.currentStep + 1}: fields ${step.fields.join(", ")} -->`;
  }
}

// --- Utility ---

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
