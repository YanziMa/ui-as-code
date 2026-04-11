/**
 * Validation Utilities: Schema-based validation, type checking, constraint validation,
 * custom rule composition, async validation, cross-field dependencies, and error formatting.
 */

// --- Types ---

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: Record<string, unknown>;
}

export interface ValidationRule<T = unknown> {
  name: string;
  validate: (value: T, context: ValidationContext) => string | null;
  message?: string;
}

export interface ValidationContext {
  /** All values in the current dataset */
  values: Record<string, unknown>;
  /** Field name being validated */
  field: string;
  /** Parent object path */
  path: string[];
  /** Custom metadata */
  meta?: Record<string, unknown>;
}

export interface FieldSchema {
  type?: "string" | "number" | "boolean" | "array" | "object" | "date" | "email" | "url" | "file";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: unknown[];
  custom?: (value: unknown, ctx: ValidationContext) => string | null;
  rules?: ValidationRule[];
  message?: string; // Default error override
  label?: string;   // Display name for error messages
  transform?: (value: unknown) => unknown;
  defaultValue?: unknown;
  dependsOn?: string[]; // Cross-field dependency names
  validateWith?: (value: unknown, allValues: Record<string, unknown>) => Promise<string | null>;
}

export interface SchemaDefinition {
  [field: string]: FieldSchema;
}

// --- Built-in Rules ---

/** Required value check */
export function required(message = "This field is required"): ValidationRule {
  return {
    name: "required",
    validate(value) {
      if (value === undefined || value === null || value === "") return message;
      if (Array.isArray(value) && value.length === 0) return message;
      return null;
    },
  };
}

/** Minimum length (string or array) */
export function minLength(min: number, message?: string): ValidationRule {
  return {
    name: "minLength",
    validate(value) {
      const len = Array.isArray(value) ? value.length : String(value ?? "").length;
      return len < min ? (message ?? `Must be at least ${min} characters`) : null;
    },
  };
}

/** Maximum length */
export function maxLength(max: number, message?: string): ValidationRule {
  return {
    name: "maxLength",
    validate(value) {
      const len = Array.isArray(value) ? value.length : String(value ?? "").length;
      return len > max ? (message ?? `Must be no more than ${max} characters`) : null;
    },
  };
}

/** Numeric minimum */
export function minValue(min: number, message?: string): ValidationRule<unknown> {
  return {
    name: "minValue",
    validate(value) {
      const num = Number(value);
      if (isNaN(num)) return null;
      return num < min ? (message ?? `Must be at least ${min}`) : null;
    },
  };
}

/** Numeric maximum */
export function maxValue(max: number, message?: string): ValidationRule<unknown> {
  return {
    name: "maxValue",
    validate(value) {
      const num = Number(value);
      if (isNaN(num)) return null;
      return num > max ? (message ?? `Must be no more than ${max}`) : null;
    },
  };
}

/** Regex pattern match */
export function matches(pattern: RegExp, message = "Invalid format"): ValidationRule {
  return {
    name: "matches",
    validate(value) {
      const str = String(value ?? "");
      return str.length > 0 && !pattern.test(str) ? message : null;
    },
  };
}

/** Email format */
export function isEmail(message = "Please enter a valid email address"): ValidationRule {
  return {
    name: "email",
    validate(value) {
      const str = String(value ?? "");
      if (!str) return null;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str) ? null : message;
    },
  };
}

/** URL format */
export function isUrl(message = "Please enter a valid URL"): ValidationRule {
  return {
    name: "url",
    validate(value) {
      const str = String(value ?? "");
      if (!str) return null;
      try { new URL(str); return null; }
      catch { return message; }
    },
  };
}

/** Enum / allowed values */
export function oneOf(allowed: unknown[], message?: string): ValidationRule {
  return {
    name: "oneOf",
    validate(value) {
      return !allowed.includes(value) ? (message ?? `Must be one of: ${allowed.join(", ")}`) : null;
    },
  };
}

/** Custom validator rule */
export function custom(
  fn: (value: unknown, ctx: ValidationContext) => string | null,
  name = "custom",
): ValidationRule {
  return { name, validate: fn };
}

/** Conditional rule - only validates when predicate returns true */
export function when(
  predicate: (values: Record<string, unknown>) => boolean,
  rule: ValidationRule,
): ValidationRule {
  return {
    name: `when:${rule.name}`,
    validate(value, ctx) {
      return predicate(ctx.values) ? rule.validate(value, ctx) : null;
    },
  };
}

// --- Schema Validator ---

/**
 * Create a validator from a schema definition.
 * Supports sync and async validation.
 */
export class SchemaValidator {
  private schema: SchemaDefinition;
  private asyncValidators: Map<string, FieldSchema["validateWith"]> = new Map();

  constructor(schema: SchemaDefinition) {
    this.schema = schema;
    // Collect async validators
    for (const [name, field] of Object.entries(schema)) {
      if (field.validateWith) this.asyncValidators.set(name, field.validateWith);
    }
  }

  /** Validate data synchronously against the schema */
  validate(data: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];
    const processedData: Record<string, unknown> = {};

    for (const [fieldName, fieldSchema] of Object.entries(this.schema)) {
      let value = data[fieldName];

      // Apply default value
      if (value === undefined && fieldSchema.defaultValue !== undefined) {
        value = fieldSchema.defaultValue;
      }

      // Apply transform
      if (value !== undefined && fieldSchema.transform) {
        value = fieldSchema.transform(value);
      }

      processedData[fieldName] = value;

      const ctx: ValidationContext = { values: data, field: fieldName, path: [fieldName] };

      // Required check
      if (fieldSchema.required) {
        const err = required().validate(value, ctx);
        if (err) {
          errors.push({ field: fieldName, message: err, code: "required", value });
          continue;
        }
      }

      // Skip further validation if empty and not required
      if (value === undefined || value === null || value === "") continue;

      // Type check
      const typeErr = this.checkType(fieldName, value, fieldSchema.type);
      if (typeErr) {
        errors.push({ field: fieldName, message: typeErr, code: "type", value });
        continue;
      }

      // Built-in constraints
      const constraintErrors = this.validateConstraints(value, fieldSchema, ctx);
      errors.push(...constraintErrors);

      // Custom rules
      if (fieldSchema.rules) {
        for (const rule of fieldSchema.rules) {
          const err = rule.validate(value, ctx);
          if (err) {
            errors.push({
              field: fieldName,
              message: rule.message || err,
              code: rule.name,
              value,
            });
          }
        }
      }

      // Custom validator function
      if (fieldSchema.custom) {
        const err = fieldSchema.custom(value, ctx);
        if (err) {
          errors.push({ field: fieldName, message: err, code: "custom", value });
        }
      }
    }

    return { valid: errors.length === 0, errors, data: processedData };
  }

  /** Validate with async validators included */
  async validateAsync(data: Record<string, unknown>): Promise<ValidationResult> {
    // First run sync validation
    const result = this.validate(data);

    if (!result.valid || this.asyncValidators.size === 0) return result;

    // Run async validations
    const asyncErrors: ValidationError[] = [];

    for (const [name, validator] of this.asyncValidators) {
      const value = data[name];
      if (value === undefined || value === null || value === "") continue;

      try {
        const err = await validator!(value, data);
        if (err) {
          asyncErrors.push({ field: name, message: err, code: "async", value });
        }
      } catch {
        asyncErrors.push({ field: name, message: "Async validation failed", code: "async_error" });
      }
    }

    result.errors.push(...asyncErrors);
    result.valid = result.errors.length === 0;
    return result;
  }

  /** Update the schema dynamically */
  updateSchema(updates: Partial<SchemaDefinition>): void {
    Object.assign(this.schema, updates);
    for (const [name, field] of Object.entries(updates)) {
      if (field?.validateWith) this.asyncValidators.set(name, field.validateWith);
    }
  }

  /** Get the current schema */
  getSchema(): SchemaDefinition { return { ...this.schema }; }

  private checkType(field: string, value: unknown, type?: FieldSchema["type"]): string | null {
    if (!type) return null;

    switch (type) {
      case "string":
        return typeof value !== "string" ? `${field} must be a string` : null;
      case "number":
        return typeof value !== "number" && isNaN(Number(value)) ? `${field} must be a number` : null;
      case "boolean":
        return typeof value !== "boolean" ? `${field} must be a boolean` : null;
      case "array":
        return !Array.isArray(value) ? `${field} must be an array` : null;
      case "object":
        return typeof value !== "object" || Array.isArray(value) || value === null ? `${field} must be an object` : null;
      case "date": {
        const d = new Date(value as string | number);
        return isNaN(d.getTime()) ? `${field} must be a valid date` : null;
      }
      case "email":
        return isEmail().validate(value) ? null : `${field} must be a valid email`;
      case "url":
        return isUrl().validate(value) ? null : `${field} must be a valid URL`;
      case "file":
        return value instanceof File ? null : `${field} must be a File`;
      default:
        return null;
    }
  }

  private validateConstraints(value: unknown, schema: FieldSchema, ctx: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];
    const field = ctx.field;

    if (schema.minLength !== undefined) {
      const err = minLength(schema.minLength).validate(value, ctx);
      if (err) errors.push({ field, message: err, code: "minLength", value });
    }

    if (schema.maxLength !== undefined) {
      const err = maxLength(schema.maxLength).validate(value, ctx);
      if (err) errors.push({ field, message: err, code: "maxLength", value });
    }

    if (schema.min !== undefined) {
      const err = minValue(schema.min).validate(value, ctx);
      if (err) errors.push({ field, message: err, code: "min", value });
    }

    if (schema.max !== undefined) {
      const err = maxValue(schema.max).validate(value, ctx);
      if (err) errors.push({ field, message: err, code: "max", value });
    }

    if (schema.pattern) {
      const err = matches(schema.pattern).validate(value, ctx);
      if (err) errors.push({ field, message: err, code: "pattern", value });
    }

    if (schema.enum) {
      const err = oneOf(schema.enum).validate(value, ctx);
      if (err) errors.push({ field, message: err, code: "enum", value });
    }

    return errors;
  }
}

// --- Quick Validators ---

/** Validate a single value against multiple rules */
export function validateField(value: unknown, rules: ValidationRule[]): string[] {
  const errors: string[] = [];
  const ctx: ValidationContext = { values: {}, field: "", path: [] };
  for (const rule of rules) {
    const err = rule.validate(value, ctx);
    if (err) errors.push(err);
  }
  return errors;
}

/** Check if a value passes all given rules */
export function isValid(value: unknown, rules: ValidationRule[]): boolean {
  return validateField(value, rules).length === 0;
}

/** Get first error from validating against rules */
export function firstError(value: unknown, rules: ValidationRule[]): string | null {
  const ctx: ValidationContext = { values: {}, field: "", path: [] };
  for (const rule of rules) {
    const err = rule.validate(value, ctx);
    if (err) return err;
  }
  return null;
}

// --- Common Validation Sets ---

/** Username validation rules */
export function usernameRules(options: { minLength?: number; maxLength?: number; pattern?: RegExp } = {}): ValidationRule[] {
  const { minLength: minLen = 3, maxLength: maxLen = 20, pattern = /^[a-zA-Z0-9_]+$/ } = options;
  return [
    required("Username is required"),
    minLength(minLen),
    maxLength(maxLen),
    matches(pattern, "Username can only contain letters, numbers, and underscores"),
  ];
}

/** Password strength validation rules */
export function passwordRules(options: { minLength?: number; requireUpper?: boolean; requireNumber?: boolean; requireSpecial?: boolean } = {}): ValidationRule[] {
  const { minLength: minLen = 8, requireUpper = true, requireNumber = true, requireSpecial = false } = options;
  const rules: ValidationRule[] = [
    required("Password is required"),
    minLength(minLen),
  ];
  if (requireUpper) {
    rules.push(matches(/[A-Z]/, "Password must contain at least one uppercase letter"));
  }
  if (requireNumber) {
    rules.push(matches(/[0-9]/, "Password must contain at least one number"));
  }
  if (requireSpecial) {
    rules.push(matches(/[^a-zA-Z0-9]/, "Password must contain at least one special character"));
  }
  return rules;
}

/** Phone number validation rules */
export function phoneRules(): ValidationRule[] {
  return [
    matches(/^\+?[\d\s\-()]{7,20}$/, "Please enter a valid phone number"),
  ];
}

/** Credit card number validation (Luhn algorithm) */
export function creditCardRules(): ValidationRule[] {
  return {
    name: "creditCard",
    validate(value) {
      const str = String(value ?? "").replace(/\s/g, "");
      if (!/^\d{13,19}$/.test(str)) return "Invalid card number";
      if (!luhnCheck(str)) return "Invalid card number (Luhn check failed)";
      return null;
    },
  } as ValidationRule;
}

function lhnCheck(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num[i]!, 10);
    if (alt) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alt = !alt;
  }
  return sum % 10 === 0;
}
// Fix typo: luhnCheck not lhnCheck
function luhnCheck(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num[i]!, 10);
    if (alt) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/** IP address validation (IPv4 or IPv6) */
export function ipRules(): ValidationRule[] {
  return [
    {
      name: "ipAddress",
      validate(value) {
        const str = String(value ?? "");
        // IPv4
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(str)) {
          const parts = str.split(".");
          return parts.every((p) => parseInt(p, 10) <= 255) ? null : "Invalid IPv4 address";
        }
        // IPv6 simplified
        if (/^([\da-fA-F]{0,4}:){2,7}[\da-fA-F]{0,4}$/.test(str)) return null;
        return "Invalid IP address";
      },
    },
  ];
}

// --- Error Formatting ---

/** Format validation errors into a human-readable summary */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return "";
  if (errors.length === 1) return errors[0]!.message;

  const byField = new Map<string, string[]>();
  for (const e of errors) {
    const list = byField.get(e.field) ?? [];
    list.push(e.message);
    byField.set(e.field, list);
  }

  const parts: string[] = [];
  for (const [field, msgs] of byField) {
    parts.push(`${field}: ${msgs.join(", ")}`);
  }
  return parts.join("; ");
}

/** Group errors by field */
export function groupErrorsByField(errors: ValidationError[]): Record<string, ValidationError[]> {
  const grouped: Record<string, ValidationError[]> = {};
  for (const e of errors) {
    if (!grouped[e.field]) grouped[e.field] = [];
    grouped[e.field]!.push(e);
  }
  return grouped;
}

/** Extract error messages as a flat string array */
export function errorMessages(errors: ValidationError[]): string[] {
  return errors.map((e) => e.message);
}

// --- Async Validation Helpers ---

/** Debounced async validation wrapper */
export function createDebouncedValidator<T>(
  validator: (value: T) => Promise<string | null>,
  debounceMs = 300,
): { validate: (value: T) => Promise<string | null>; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastReject: ((reason: string) => void) | null = null;

  return {
    validate(value) {
      return new Promise((resolve, reject) => {
        if (timer) clearTimeout(timer);
        if (lastReject) lastReject("cancelled");
        lastReject = reject;

        timer = setTimeout(async () => {
          timer = null;
          lastReject = null;
          try {
            const result = await validator(value);
            resolve(result);
          } catch (e) {
            reject(String(e));
          }
        }, debounceMs);
      });
    },
    cancel() {
      if (timer) { clearTimeout(timer); timer = null; }
      if (lastReject) { lastReject("cancelled"); lastReject = null; }
    },
  };
}

/** Compose multiple async validators - runs in parallel */
export function combineAsyncValidators(
  validators: Array<(value: unknown, ctx: ValidationContext) => Promise<string | null>>,
): (value: unknown, ctx: ValidationContext) => Promise<string | null> {
  return async (value, ctx) => {
    const results = await Promise.all(validators.map((v) => v(value, ctx)));
    return results.find((r) => r !== null) ?? null;
  };
}
