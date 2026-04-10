/**
 * Data validation utilities with schema-based validation,
 * type guards, sanitization, and error collection.
 */

// --- Types ---

export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
  code?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: Record<string, unknown>;
}

export interface ValidationRule {
  /** Field name */
  field: string;
  /** Display label (used in error messages) */
  label?: string;
  /** Required? */
  required?: boolean;
  /** Type check */
  type?: "string" | "number" | "boolean" | "array" | "object" | "date" | "email" | "url" | "integer" | "float";
  /** Minimum value / length */
  min?: number;
  /** Maximum value / length */
  max?: number;
  /** Pattern (regex string) */
  pattern?: string | RegExp;
  /** Custom validator function */
  validate?: (value: unknown) => string | null | Promise<string | null>;
  /** Enum of allowed values */
  enum?: unknown[];
  /** Custom error message */
  message?: string;
  /** Sanitizer applied before validation */
  sanitize?: (value: unknown) => unknown;
  /** Conditional: only validate if this returns true */
  when?: (data: Record<string, unknown>) => boolean;
}

export interface ValidationSchema {
  rules: ValidationRule[];
  /** Strip unknown fields? */
  stripUnknown?: boolean;
  /** Global custom validators */
  beforeValidate?: (data: Record<string, unknown>) => ValidationResult | void;
  afterValidate?: (result: ValidationResult) => ValidationResult | void;
}

// --- Type Guards ---

/** Check if value is a non-empty string */
export function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** Check if value is a number (including NaN check) */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

/** Check if value is an integer */
export function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}

/** Check if value is a finite number */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Check if value is a boolean */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/** Check if value is an array */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Check if value is a plain object */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Check if value is a Date or valid date string */
export function isDate(value: unknown): value is Date | string {
  if (value instanceof Date) return !isNaN(value.getTime());
  if (typeof value === "string") {
    const d = new Date(value);
    return !isNaN(d.getTime());
  }
  return false;
}

/** Check if value looks like an email */
export function isEmail(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^[^\s\S]+@[\w.-]+\.[\w.]+$/.test(value);
}

/** Check if value looks like a URL */
export function isUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

/** Check if value is null or undefined */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/** Check if value is not null/undefined/empty */
export function isPresent(value: unknown): boolean {
  if (isNil(value)) return false;
  if (typeof value === "string") return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

// --- Schema Validation ---

/** Validate data against a schema */
export async function validate(
  data: Record<string, unknown>,
  schema: ValidationSchema,
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const sanitized: Record<string, unknown> = { ...data };

  // Run beforeValidate hook
  if (schema.beforeValidate) {
    const earlyResult = schema.beforeValidate(data);
    if (earlyResult && !earlyResult.valid) {
      errors.push(...earlyResult.errors);
      return { valid: false, errors };
    }
  }

  for (const rule of schema.rules) {
    // Skip conditional rules that don't apply
    if (rule.when && !rule.when(data)) continue;

    const value = data[rule.field];
    const label = rule.label ?? rule.field;

    // Apply sanitizer
    let checkValue = rule.sanitize ? rule.sanitize(value) : value;

    // Required check
    if (rule.required && isNil(checkValue)) {
      errors.push({
        field: rule.field,
        message: rule.message ?? `${label} is required`,
        value: checkValue,
        code: "required",
      });
      continue;
    }

    // Skip optional nil values
    if (!rule.required && isNil(checkValue)) continue;

    // Type check
    if (rule.type) {
      const typeError = checkType(checkValue, rule.type, label);
      if (typeError) {
        errors.push({ field: rule.field, message: typeError, value: checkValue, code: "type" });
        continue;
      }
    }

    // Min/max checks
    if (rule.min !== undefined) {
      const minError = checkMin(checkValue, rule.min, rule.type ?? inferType(checkValue), label);
      if (minError) {
        errors.push({ field: rule.field, message: minError, value: checkValue, code: "min" });
        continue;
      }
    }

    if (rule.max !== undefined) {
      const maxError = checkMax(checkValue, rule.max, rule.type ?? inferType(checkValue), label);
      if (maxError) {
        errors.push({ field: rule.field, message: maxError, value: checkValue, code: "max" });
        continue;
      }
    }

    // Pattern check
    if (rule.pattern) {
      const regex = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern);
      if (typeof checkValue === "string" && !regex.test(checkValue)) {
        errors.push({
          field: rule.field,
          message: rule.message ?? `${label} does not match the required format`,
          value: checkValue,
          code: "pattern",
        });
        continue;
      }
    }

    // Enum check
    if (rule.enum && !rule.enum.includes(checkValue)) {
      errors.push({
        field: rule.field,
        message: rule.message ?? `${label} must be one of: ${rule.enum.join(", ")}`,
        value: checkValue,
        code: "enum",
      });
      continue;
    }

    // Custom validator
    if (rule.validate) {
      const result = await rule.validate(checkValue);
      if (result) {
        errors.push({ field: rule.field, message: result, value: checkValue, code: "custom" });
        continue;
      }
    }

    sanitized[rule.field] = checkValue;
  }

  // Strip unknown fields
  if (schema.stripUnknown) {
    const knownFields = new Set(schema.rules.map((r) => r.field));
    for (const key of Object.keys(sanitized)) {
      if (!knownFields.has(key)) delete sanitized[key];
    }
  }

  const result: ValidationResult = {
    valid: errors.length === 0,
    errors,
    data: sanitized,
  };

  // Run afterValidate hook
  if (schema.afterValidate) {
    const modified = schema.afterValidate(result);
    if (modified) return modified;
  }

  return result;
}

/** Synchronous version of validate */
export function validateSync(
  data: Record<string, unknown>,
  schema: ValidationSchema,
): ValidationResult {
  // Convert async validators to sync by running them without awaiting
  const syncRules = schema.rules.map((r) => ({
    ...r,
    validate: r.validate
      ? ((v: unknown) => {
          const result = r.validate(v);
          return result instanceof Promise ? null : result;
        })
      : undefined,
  }));

  return validate(data, { ...schema, rules: syncRules }) as never as ValidationResult;
}

// --- Quick Validators ---

/** Validate a single field value */
export function assert(
  condition: boolean,
  message: string,
  code = "assertion_failed",
): asserts condition {
  if (!condition) throw new ValidationError(message, code);
}

export class ValidationError extends Error {
  code: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "ValidationError";
    this.code = code ?? "validation_error";
  }
}

/** Validate and throw on failure */
export function throwIfInvalid(
  data: Record<string, unknown>,
  schema: ValidationSchema,
): Record<string, unknown> {
  const result = validateSync(data, schema);
  if (!result.valid) {
    throw new ValidationError(result.errors[0]?.message ?? "Validation failed", result.errors[0]?.code);
  }
  return result.data!;
}

// --- Internal Helpers ---

function checkType(value: unknown, type: string, label: string): string | null {
  switch (type) {
    case "string":
      if (typeof value !== "string") return `${label} must be a string`;
      break;
    case "number":
      if (typeof value !== "number" || isNaN(value)) return `${label} must be a number`;
      break;
    case "integer":
      if (!Number.isInteger(value)) return `${label} must be an integer`;
      break;
    case "float":
      if (typeof value !== "number" || isNaN(value) || Number.isInteger(value)) return `${label} must be a decimal number`;
      break;
    case "boolean":
      if (typeof value !== "boolean") return `${label} must be true or false`;
      break;
    case "array":
      if (!Array.isArray(value)) return `${label} must be an array`;
      break;
    case "object":
      if (value === null || typeof value !== "object" || Array.isArray(value)) return `${label} must be an object`;
      break;
    case "date":
      if (!isDate(value)) return `${label} must be a valid date`;
      break;
    case "email":
      if (!isEmail(value)) return `${label} must be a valid email address`;
      break;
    case "url":
      if (!isUrl(value)) return `${label} must be a valid URL`;
      break;
  }
  return null;
}

function inferType(value: unknown): ValidationRule["type"] {
  if (isEmail(value)) return "email";
  if (isUrl(value)) return "url";
  if (isDate(value)) return "date";
  if (isInteger(value)) return "integer";
  if (isFiniteNumber(value)) return "float";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) return "array";
  if (isObject(value)) return "object";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  return undefined;
}

function checkMin(value: unknown, min: number, type: string | undefined, label: string): string | null {
  if (type === "string" || type === "array") {
    const len = (value as string | unknown[])?.length ?? 0;
    if (len < min) return `${label} must be at least ${min} characters/items long`;
  } else if (type === "number" || type === "integer" || type === "float") {
    if ((value as number) < min) return `${label} must be at least ${min}`;
  } else if (value instanceof Date) {
    if (value.getTime() < min) return `${label} must be after ${new Date(min).toISOString()}`;
  }
  return null;
}

function checkMax(value: unknown, max: number, type: string | undefined, label: string): string | null {
  if (type === "string" || type === "array") {
    const len = (value as string | unknown[])?.length ?? 0;
    if (len > max) return `${label} must be at most ${max} characters/items long`;
  } else if (type === "number" || type === "integer" || type === "float") {
    if ((value as number) > max) return `${label} must be at most ${max}`;
  } else if (value instanceof Date) {
    if (value.getTime() > max) return `${label} must be before ${new Date(max).toISOString()}`;
  }
  return null;
}
