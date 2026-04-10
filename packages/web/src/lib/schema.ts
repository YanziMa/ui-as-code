/**
 * Schema validation utilities (lightweight, Zod-like API without dependency).
 */

export type SchemaType = "string" | "number" | "boolean" | "array" | "object" | "unknown";

export interface SchemaRule {
  type?: SchemaType;
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: readonly unknown[];
  custom?: (value: unknown) => string | null; // Returns error message or null
  message?: string;
}

export interface FieldSchema {
  [fieldName: string]: SchemaRule;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
  data: Record<string, unknown>;
}

/** Validate an object against a field schema */
export function validate<T = Record<string, unknown>>(
  data: unknown,
  schema: FieldSchema,
): ValidationResult & { data: T } {
  const errors: Record<string, string[]> = {};
  const cleaned: Record<string, unknown> = {};

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { valid: false, errors: { _form: ["Invalid input: expected object"] }, data: {} as T };
  }

  const record = data as Record<string, unknown>;

  for (const [field, rule] of Object.entries(schema)) {
    const value = record[field];
    const fieldErrors: string[] = [];

    // Required check
    if (rule.required && (value === undefined || value === null)) {
      fieldErrors.push(rule.message ?? `${field} is required`);
      errors[field] = fieldErrors;
      continue;
    }

    // Skip optional fields that are absent
    if (value === undefined || value === null) {
      continue;
    }

    // Type check
    if (rule.type) {
      const typeError = checkType(value, rule.type);
      if (typeError) {
        fieldErrors.push(rule.message ?? `${field} must be ${rule.type}`);
      }
    }

    // String validations
    if (typeof value === "string") {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        fieldErrors.push(rule.message ?? `${field} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        fieldErrors.push(rule.message ?? `${field} must be at most ${rule.maxLength} characters`);
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        fieldErrors.push(rule.message ?? `${field} has invalid format`);
      }
    }

    // Number validations
    if (typeof value === "number") {
      if (rule.min !== undefined && value < rule.min) {
        fieldErrors.push(rule.message ?? `${field} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        fieldErrors.push(rule.message ?? `${field} must be at most ${rule.max}`);
      }
    }

    // Array length
    if (Array.isArray(value)) {
      if (rule.min !== undefined && value.length < rule.min) {
        fieldErrors.push(rule.message ?? `${field} must have at least ${rule.min} items`);
      }
      if (rule.max !== undefined && value.length > rule.max) {
        fieldErrors.push(rule.message ?? `${field} must have at most ${rule.max} items`);
      }
    }

    // Enum check
    if (rule.enum && !rule.enum.includes(value)) {
      fieldErrors.push(
        rule.message ??
          `${field} must be one of: ${(rule.enum as unknown[]).join(", ")}`,
      );
    }

    // Custom validator
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) fieldErrors.push(customError);
    }

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    } else {
      cleaned[field] = value;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: cleaned as T,
  };
}

function checkType(value: unknown, expected: SchemaType): string | null {
  switch (expected) {
    case "string": return typeof value === "string" ? null : "expected string";
    case "number": return typeof value === "number" ? null : "expected number";
    case "boolean": return typeof value === "boolean" ? null : "expected boolean";
    case "array": return Array.isArray(value) ? null : "expected array";
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value)
        ? null : "expected object";
    case "unknown": return null;
    default: return null;
  }
}

/** Quick single-field validation */
export function validateField(
  value: unknown,
  rule: SchemaRule,
): string | null {
  const result = validate({ _value: value }, { _value: rule });
  return result.valid ? null : result.errors._value?.[0] ?? null;
}

/** Create a reusable validator from a schema */
export function createValidator<T>(schema: FieldSchema) {
  return {
    validate: (data: unknown) => validate<T>(data, schema),
    assert: (data: unknown): T => {
      const result = validate<T>(data, schema);
      if (!result.valid) {
        const messages = Object.values(result.errors).flat();
        throw new Error(`Validation failed: ${messages.join("; ")}`);
      }
      return result.data;
    },
  };
}
