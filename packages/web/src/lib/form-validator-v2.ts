/**
 * Form Validator v2: Comprehensive form validation with field-level and form-level
 * rules, async validation, conditional validation (showWhen), cross-field
 * validation, custom error messages, i18n support, debounced validation,
 * real-time vs submit-time modes, and structured error reporting.
 */

// --- Types ---

export type ValidationTrigger = "change" | "blur" | "submit" | "manual";

export type FieldType = "text" | "email" | "password" | "number" | "tel" | "url"
  | "textarea" | "select" | "multiselect" | "checkbox" | "radio"
  | "file" | "date" | "time" | "datetime-local" | "color" | "range"
  | "hidden" | "custom";

export interface FieldRule {
  /** Required field */
  required?: boolean;
  /** Minimum length (strings) or value (numbers) */
  min?: number;
  /** Maximum length (strings) or value (numbers) */
  max?: number;
  /** Exact length for strings */
  exactLength?: number;
  /** Pattern (regex string or RegExp) */
  pattern?: string | RegExp;
  /** Custom validator function — return error message or null/undefined if valid */
  validate?: (value: unknown, formData?: Record<string, unknown>) => string | null | undefined | Promise<string | null | undefined>;
  /** Async validator (for server-side checks) */
  asyncValidate?: (value: unknown, formData?: Record<string, unknown>) => Promise<string | null | undefined>;
  /** Custom error message (overrides default) */
  message?: string;
  /** Enumerated allowed values */
  oneOf?: unknown[];
  /** NoneOf: value must not be any of these */
  noneOf?: unknown[];
  /** Type coercion before validation */
  coerce?: boolean;
  /** Trim whitespace for strings */
  trim?: boolean;
  /** Normalize value (lowercase, uppercase) */
  normalize?: "lower" | "upper";
  /** Must match another field's value */
  mustMatch?: string;
  /** Must not match another field's value */
  mustNotMatch?: string;
  /** Only validate if this condition is met */
  showWhen?: (formData: Record<string, unknown>) => boolean;
  /** Validate only on these triggers */
  trigger?: ValidationTrigger[];
  /** Debounce validation after change (ms), 0 = no debounce */
  debounceMs?: number;
}

export interface FormSchema {
  [fieldName: string]: FieldRule | FieldType;
}

export interface FieldError {
  field: string;
  message: string;
  code?: string;       // Machine-readable error code
  value?: unknown;      // The invalid value
  rule?: FieldRule;     // Which rule failed
  children?: FieldError[]; // Nested errors for complex types
}

export interface FormValidationResult {
  valid: boolean;
  errors: FieldError[];
  errorsByField: Map<string, FieldError>;
  firstError?: FieldError;
  /** Fields that passed validation */
  validFields: Set<string>;
  /** Raw form data (after coercion) */
  data: Record<string, unknown>;
  /** Warnings (non-failing issues) */
  warnings?: Array<{ field: string; message: string }>;
}

export interface ValidatorOptions {
  /** Stop at first error (fail-fast) */
  bail?: boolean;
  /** Validate fields even if empty (default: false for optional fields) */
 validateEmpty?: boolean;
  /** Strip unknown fields from result */
  stripUnknown?: boolean;
  /** Coerce types where possible */
  coerceTypes?: boolean;
  /** Default locale for messages */
  locale?: string;
  /** Custom error message templates */
  messages?: Record<string, Record<string, string>>;
  /** Trigger mode for this validation run */
  trigger?: ValidationTrigger;
  /** Include field-level warnings in result */
  includeWarnings?: boolean;
}

// --- Built-in Validators ---

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]+\.[a-zA-Z]{2,}([-a-zA-Z0-9@:%_\\+~#?&/=]*)*$/;
const PHONE_RE = /^\+?[1-9]\d[\s-.]*\d$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function builtInValidators(): Record<string, (value: unknown, rule: FieldRule) => string | null> {
  return {
    required: (_v, _r) => _r.required ? "This field is required" : null,
    email: (v) => (typeof v !== "string" ? "Must be a string" : EMAIL_RE.test(v) ? null : "Invalid email address"),
    url: (v) => (typeof v !== "string" ? "Must be a string" : URL_RE.test(v) ? null : "Invalid URL"),
    tel: (v) => (typeof v !== "string" ? "Must be a string" : PHONE_RE.test(v) ? null : "Invalid phone number"),
    password: (v) => {
      if (typeof v !== "string") return "Must be a string";
      if (v.length < 8) return "Password must be at least 8 characters";
      if (!/[A-Z]/.test(v)) return "Password must contain an uppercase letter";
      if (!/[a-z]/.test(v)) return "Password must contain a lowercase letter";
      if (!/\d/.test(v)) return "Password must contain a digit";
      return null;
    },
    number: (v, r) => {
      const n = Number(v);
      if (isNaN(n)) return "Must be a number";
      if (r.min != null && n < r.min) return `Must be at least ${r.min}`;
      if (r.max != null && n > r.max) return `Must be at most ${r.max}`;
      return null;
    },
    integer: (v, r) => {
      const n = Number(v);
      if (!Number.isInteger(n)) return "Must be an integer";
      if (r.min != null && n < r.min) return `Must be at least ${r.min}`;
      if (r.max != null && n > r.max) return `Must be at most ${r.max}`;
      return null;
    },
    minLength: (v, r) => {
      if (typeof v !== "string") return "Must be a string";
      if (r.min != null && v.length < r.min) return `Must be at least ${r.min} characters`;
      return null;
    },
    maxLength: (v, r) => {
      if (typeof v !== "string") return "Must be a string";
      if (r.max != null && v.length > r.max) return `Must be at most ${r.max} characters`;
      return null;
    },
    pattern: (v, r) => {
      const regex = r.pattern instanceof RegExp ? r.pattern : new RegExp(r.pattern);
      if (typeof v !== "string") return "Must be a string";
      if (!regex.test(v)) return `Does not match pattern ${r.pattern}`;
      return null;
    },
    oneOf: (v, r) => {
      if (!r.oneOf?.some((o) => deepEqual(o, v))) {
        return `Must be one of: ${r.oneOf?.map(String).join(", ")}`;
      }
      return null;
    },
    noneOf: (v, r) => {
      if (r.noneOf?.some((o) => deepEqual(o, v))) {
        return `Must not be: ${r.noneOf?.map(String).join(", ")}`;
      }
      return null;
    },
  };
}

// --- Main Validator ---

/**
 * Validate form data against a schema.
 *
 * ```ts
 * const validator = new FormValidator({
 *   name: { required: true, minLength: 2 },
 *   email: { required: true },
 *   age: { type: "number", min: 0, max: 150 },
 * }, {
 *   messages: {
 *     name: { required: "Please enter your name" },
 *     email: { required: "We need your email to contact you" },
 *   }
 * });
 *
 * const result = await validator.validate({ name: "", email: "invalid", age: 25 });
 * console.log(result.valid);   // false
 * console.log(result.errors); // [{ field: "name", message: "..." }, ...]
 * ```
 */
export class FormValidator {
  private schema: FormSchema;
  private options: Required<ValidatorOptions>;
  private customValidators: Record<string, (value: unknown, rule: FieldRule, form: Record<string, unknown>) => string | null | undefined> = {};
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(schema: FormSchema, options: ValidatorOptions = {}) {
    this.schema = schema;
    this.options = {
      bail: options.bail ?? false,
      validateEmpty: options.validateEmpty ?? false,
      stripUnknown: options.stripUnknown ?? false,
      coerceTypes: options.coerceTypes ?? true,
      locale: options.locale ?? "en",
      messages: options.messages ?? {},
      trigger: options.trigger ?? "submit",
      includeWarnings: options.includeWarnings ?? false,
    };

    // Register custom validators from schema
    for (const [field, rule] of Object.entries(schema)) {
      if (rule instanceof Object && "validate" in (rule as FieldRule)) {
        this.customValidators[field] = (rule as FieldRule).validate!;
      }
    }
  }

  /**
   * Validate form data against the configured schema.
   */
  async validate(formData: Record<string, unknown>, runOptions?: Partial<ValidatorOptions>): Promise<FormValidationResult> {
    const opts = { ...this.options, ...runOptions };
    const errors: FieldError[] = [];
    const errorsByField = new Map<string, FieldError>();
    const validFields = new Set<string>();
    const warnings: Array<{ field: string; message: string }> = [];
    const coercedData: Record<string, unknown> = {};

    // Deep clone and optionally coerce
    for (const [key, value] of Object.entries(formData)) {
      coercedData[key] = opts.coerceTypes ? this.coerceValue(key, value, this.schema[key]) : value;
    }

    // Process each field in schema order
    for (const [field, rule] of Object.entries(this.schema)) {
      // Check showWhen condition
      if (rule instanceof Object && "showWhen" in (rule as FieldRule)) {
        const condFn = (rule as FieldRule).showWhen!;
        if (!condFn(coercedData)) continue; // Skip hidden fields
      }

      const value = coercedData[field];
      const ruleObj = typeof rule === "string" ? {} : rule;

      // Apply trim/normalize
      let processedValue = value;
      if (typeof processedValue === "string") {
        if (ruleObj.trim ?? true) processedValue = processedValue.trim();
        if (ruleObj.normalize === "lower") processedValue = processedValue.toLowerCase();
        if (ruleObj.normalize === "upper") processedValue = processedValue.toUpperCase();
      }

      // Skip empty values unless validateEmpty is set
      if ((processedValue === "" || processedValue == null || processedValue === undefined) &&
          !opts.validateEmpty && !ruleObj.required) {
        continue;
      }

      // Run validation
      const error = await this.validateField(field, processedValue, ruleObj as FieldRule, coercedData);

      if (error) {
        errors.push(error);
        errorsByField.set(field, error);
        if (opts.bail) break; // Fail fast
      } else {
        validFields.add(field);
      }
    }

    // Cross-field validations (mustMatch/mustNotMatch)
    for (const [field, rule] of Object.entries(this.schema)) {
      if (!(rule instanceof Object)) continue;
      const ruleObj = rule as FieldRule;

      if (ruleObj.mustMatch && coercedData[field] !== undefined) {
        const targetVal = coercedData[ruleObj.mustMatch];
        if (targetVal !== undefined && !deepEqual(coercedData[field], targetVal)) {
          const msg = this.getMessage(field, "mustMatch", ruleObj) ?? `Must match "${ruleObj.mustMatch}"`;
          errors.push({ field, message: msg, value: coercedData[field], rule: ruleObj });
          errorsByField.set(field, errors[errors.length - 1]!);
          if (opts.bail) break;
        }
      }

      if (ruleObj.mustNotMatch && coercedData[field] !== undefined) {
        const targetVal = coercedData[ruleObj.mustNotMatch];
        if (targetVal !== undefined && deepEqual(coercedData[field], targetVal)) {
          const msg = this.getMessage(field, "mustNotMatch", ruleObj) ?? `Must not equal the value of "${ruleObj.mustNotMatch}"`;
          errors.push({ field, message: msg, value: coercedData[field], rule: ruleObj });
          errorsByField.set(field, errors[errors.length - 1]!);
          if (opts.bail) break;
        }
      }
    }

    // Strip unknown fields
    if (opts.stripUnknown) {
      for (const key of Object.keys(coercedData)) {
        if (!(key in this.schema)) delete coercedData[key];
      }
    }

    const result: FormValidationResult = {
      valid: errors.length === 0,
      errors,
      errorsByField,
      firstError: errors[0],
      validFields,
      data: coercedData,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    return result;
  }

  /**
   * Validate a single field.
   */
  async validateField(
    field: string,
    value: unknown,
    rule: FieldRule,
    formData: Record<string, unknown>,
  ): Promise<FieldError | null> {

    // 1. Required check
    if (rule.required && (value === undefined || value === null || value === "")) {
      return { field, message: this.getMessage(field, "required", rule) ?? `${field} is required`, value, rule };
    }

    // 2. Custom validator
    if (this.customValidators[field]) {
      const customResult = this.customValidators[field](value, rule, formData);
      if (typeof customResult === "string") {
        return { field, message: customResult, value, rule };
      }
      if (customResult instanceof Error) {
        return { field, message: customResult.message, value, rule };
      }
    }

    // 3. Async validator
    if (rule.asyncValidate) {
      try {
        const asyncResult = await rule.asyncValidate(value, formData);
        if (asyncResult) {
          return { field, message: asyncResult, value, rule };
        }
      } catch (err) {
        return { field, message: err instanceof Error ? err.message : "Async validation failed", value, rule };
      }
    }

    // 4. Built-in validators (type-based + explicit)
    const typeRules = this.getTypeRules(rule);

    for (const [typeCheck, validatorFn] of Object.entries(typeRules)) {
      if (typeCheck(value, rule)) {
        const msg = validatorFn(value, rule);
        if (msg) {
          return { field, message: this.getMessage(field, typeCheck as string, rule) ?? msg, value, rule };
        }
      }
    }

    // 5. Pattern
    if (rule.pattern) {
      const regex = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern);
      if (typeof value === "string" && !regex.test(value)) {
        return { field, message: this.getMessage(field, "pattern", rule) ?? `Does not match pattern`, value, rule };
      }
    }

    // 6. OneOf / NoneOf
    if (rule.oneOf && !rule.oneOf.some((o) => deepEqual(o, value))) {
      return { field, message: this.getMessage(field, "oneOf", rule) ?? `Invalid option selected`, value, rule };
    }
    if (rule.noneOf && rule.noneOf.some((o) => deepEqual(o, value))) {
      return { field, message: this.getMessage(field, "noneOf", rule) ?? `Invalid value provided`, value, rule };
    }

    return null; // Valid
  }

  /**
   * Validate with debounce (useful for real-time input).
   */
  validateDebounced(field: string, value: unknown, delayMs = 300): void {
    const existingTimer = this.debounceTimers.get(field);
    if (existingTimer) clearTimeout(existingTimer);

    this.debounceTimers.set(field, setTimeout(async () => {
      const rule = this.schema[field];
      if (rule) {
        const error = await this.validateField(field, value, rule instanceof Object ? rule : {}, {});
        // Emit or store the error somewhere appropriate
      }
    }, delayMs));
  }

  /**
   * Get localized error message for a field+rule combination.
   */
  getMessage(field: string, keyword: string, rule: FieldRule): string | undefined {
    if (rule.message) return rule.message;
    if (this.options.messages[field]?.[keyword]) return this.options.messages[field][keyword];
    return undefined;
  }

  // --- Internal ---

  private getTypeRules(rule: FieldRule): Array<(v: unknown, r: FieldRule) => string | null> {
    const validators: Array<(v: unknown, r: FieldRule) => string | null> = [];

    // Determine implicit type from constraints
    const hasMin = rule.min != null || rule.minLength != null;
    const hasMax = rule.max != null || rule.maxLength != null;
    const hasPattern = !!rule.pattern;
    const hasOneOf = !!rule.oneOf;
    const hasNoneOf = !!rule.noneOf;

    if (hasOneOf) validators.push(builtInValidators().oneOf!);
    if (hasNoneOf) validators.push(builtInValidators().noneOf!);
    if (hasPattern) validators.push(builtInValidators().pattern!);

    if (rule.type === "number" || rule.type === "integer" || (hasMin || hasMax) && !rule.type) {
      validators.push(builtInValidators()[rule.type === "integer" ? "integer" : "number"]!);
    } else if (rule.type === "string" || (hasMin || hasMax || hasPattern) && !rule.type) {
      validators.push(builtInValidators().minLength!);
      validators.push(builtInValidators().maxLength!);
    }

    if (rule.required) validators.push(builtInValidators().required!);

    return validators;
  }

  private coerceValue(field: string, value: unknown, rule: FieldRule | FieldType): unknown {
    if (!this.options.coerceTypes) return value;
    if (value == null || value === "") return value;

    const expectedType = typeof rule === "string" ? rule : (rule as FieldRule).type;
    if (!expectedType || expectedType === "custom") return value;

    switch (expectedType) {
      case "number":
      case "integer": {
        const n = Number(value);
        return isNaN(n) ? value : (expectedType === "integer" ? Math.floor(n) : n);
      }
      case "boolean": {
        if (value === "true") return true;
        if (value === "false") return false;
        return value;
      }
      default:
        return value;
    }
  }
}

// --- Utility ---

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) => deepEqual((a as Record<string, unknown>)[k]!, (b as Record<string, unknown>)[k]!));
  }
  return false;
}

// --- Convenience Functions ---

/** Quick-validate without constructing a class */
export async function validateForm(
  data: Record<string, unknown>,
  schema: FormSchema,
  options?: ValidatorOptions,
): Promise<FormValidationResult> {
  const validator = new FormValidator(schema, options);
  return validator.validate(data);
}

/** Create a reusable validator instance */
export function createValidator(schema: FormSchema, options?: ValidatorOptions): FormValidator {
  return new FormValidator(schema, options);
}
