/**
 * Validation Utilities: Type guards, range validators, schema validation,
 * object shape validation, async validation, validation result builder,
 * custom rule composition, i18n error messages.
 */

// --- Types ---

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

export interface ValidationRule<T = unknown> {
  name: string;
  validate: (value: T, context?: unknown) => boolean | string; // true=pass, false/fail, string=custom error
  message?: string;
}

export interface FieldSchema<T = unknown> {
  required?: boolean;
  rules?: ValidationRule<T>[];
  defaultValue?: T;
  transform?: (value: unknown) => T;
  custom?: (value: T) => string | null; // Return error message or null if valid
}

export type ObjectSchema = Record<string, FieldSchema>;

// --- Type Guards ---

/** Check if value is a non-null string */
export function isString(value: unknown): value is string { return typeof value === "string"; }

/** Check if value is a number (excludes NaN) */
export function isNumber(value: unknown): value is number { return typeof value === "number" && !isNaN(value); }

/** Check if value is an integer */
export function isInteger(value: unknown): value is number { return Number.isInteger(value); }

/** Check if value is a finite number */
export function isFiniteNumber(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }

/** Check if value is a plain object (not array, not null) */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Check if value is an array */
export function isArray(value: unknown): value is unknown[] { return Array.isArray(value); }

/** Check if value is a Date and valid */
export function isValidDate(value: unknown): value is Date { return value instanceof Date && !isNaN(value.getTime()); }

/** Check if value is a boolean */
export function isBoolean(value: unknown): value is boolean { return typeof value === "boolean"; }

/** Check if value is a function */
export function isFunction(value: unknown): value is Function { return typeof value === "function"; }

/** Check if value is null or undefined */
export function isNil(value: unknown): value is null | undefined { return value == null; }

/** Check if value is not null or undefined */
export function isNotNil(value: unknown): boolean { return value != null; }

/** Check if value is empty (null, undefined, "", [], {}, 0-length) */
export function isEmpty(value: unknown): boolean {
  if (isNil(value)) return true;
  if (isString(value)) return value.length === 0;
  if (isArray(value)) return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  if (isMap(value) || isSet(value)) return value.size === 0;
  return false;
}

/** Check if value is a Map */
export function isMap(value: unknown): value is Map<unknown, unknown> { return value instanceof Map; }

/** Check if value is a Set */
export function isSet(value: unknown): value is Set<unknown> { return value instanceof Set; }

/** Check if value is a Promise */
export function isPromise(value: unknown): value is Promise<unknown> {
  return value !== null && (typeof value === "object" || typeof value === "function") &&
    typeof (value as Promise<unknown>).then === "function";
}

// --- Format Validators ---

/** Validate email format (RFC 5322 compliant-ish) */
export function isEmail(value: unknown): value is string {
  if (!isString(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Validate URL format */
export function isURL(value: unknown): value is string {
  if (!isString(value)) return false;
  try { new URL(value); return true; } catch { return /^https?:\/\/.+/.test(value); }
}

/** Validate UUID format (v1-v5) */
export function isUUID(value: unknown): boolean {
  if (!isString(value)) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Validate UUID v4 specifically */
export function isUUIDv4(value: unknown): boolean {
  if (!isString(value)) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Validate hex color (#RGB, #RRGGBB, #RRGGBBAA) */
export function isHexColor(value: unknown): boolean {
  if (!isString(value)) return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

/** Validate IPv4 address */
export function isIPv4(value: unknown): boolean {
  if (!isString(value)) return false;
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d+$/.test(p) && parseInt(p, 10) >= 0 && parseInt(p, 10) <= 255);
}

/** Validate IPv6 address */
export function isIPv6(value: unknown): boolean {
  if (!isString(value)) return false;
  // Simplified IPv6 check
  return /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(value) || value === "::";
}

/** Validate IP address (v4 or v6) */
export function isIP(value: unknown): boolean { return isIPv4(value) || isIPv6(value); }

/** Validate MAC address format */
export function isMACAddress(value: unknown): boolean {
  if (!isString(value)) return false;
  return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(value);
}

/** Validate credit card number (Luhn algorithm) */
export function isCreditCard(value: unknown): boolean {
  if (!isString(value)) return false;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]!, 10);
    if (isEven) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

/** Detect credit card brand from number */
export function detectCardBrand(cardNumber: string): string | null {
  const cleaned = cardNumber.replace(/\D/g, "");
  const patterns: [RegExp, string][] = [
    [/^4/, "Visa"],
    [/^5[1-5]/, "Mastercard"],
    [/^3[47]/, "American Express"],
    [/^6(?:011|5)/, "Discover"],
    [/^(?:2131|1800|35\d{3})/, "JCB"],
    [/^3(?:0[0-5]|[68])/, "Diners Club"],
    [/^(?:5018|5020|5038|5612|5893|63|67)\d{0,14}/, "Maestro"],
  ];
  for (const [pattern, brand] of patterns) if (pattern.test(cleaned)) return brand;
  return null;
}

/** Validate phone number (basic international format) */
export function isPhoneNumber(value: unknown): boolean {
  if (!isString(value)) return false;
  return /^\+?[1-9]\d{6,14}$/.test(value.replace(/[\s()-]/g, ""));
}

/** Validate ISO date string (YYYY-MM-DD) */
export function isISODate(value: unknown): boolean {
  if (!isString(value)) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

/** Validate ISO datetime string */
export function isISODateTime(value: unknown): boolean {
  if (!isString(value)) return false;
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(value) && !isNaN(Date.parse(value));
}

/** Validate JSON string */
export function isJSON(value: unknown): boolean {
  if (!isString(value)) return false;
  try { JSON.parse(value); return true; } catch { return false; }
}

/** Validate that string matches a regex pattern */
export function matchesPattern(value: unknown, pattern: RegExp): boolean {
  if (!isString(value)) return false;
  return pattern.test(value);
}

/** Check if string is within length bounds */
export function isLength(value: unknown, min?: number, max?: number): boolean {
  if (!isString(value)) return false;
  if (min !== undefined && value.length < min) return false;
  if (max !== undefined && value.length > max) return false;
  return true;
}

/** Check if array is within size bounds */
export function isArraySize(value: unknown, min?: number, max?: number): boolean {
  if (!Array.isArray(value)) return false;
  if (min !== undefined && value.length < min) return false;
  if (max !== undefined && value.length > max) return false;
  return true;
}

/** Check if number is in range [min, max] */
export function inRange(value: unknown, min: number, max: number): boolean {
  if (!isFiniteNumber(value)) return false;
  return value >= min && value <= max;
}

/** Check if value is one of allowed values */
export function isOneOf<T>(value: unknown, allowed: readonly T[]): value is T {
  return allowed.includes(value as T);
}

/** Check if all items in array pass predicate */
export function every<T>(arr: unknown[], predicate: (item: T) => boolean): arr is T[] {
  return Array.isArray(arr) && arr.every((item) => predicate(item as T));
}

/** Check if some items in array pass predicate */
export function some<T>(arr: unknown[], predicate: (item: T) => boolean): boolean {
  return Array.isArray(arr) && arr.some((item) => predicate(item as T));
}

// --- Schema Validator ---

/**
 * Validate an object against a schema definition.
 *
 * @example
 * ```ts
 * const result = validate({ name: "Alice", age: 30 }, {
 *   name: { required: true, rules: [{ name: "string", validate: isString }] },
 *   age:  { { rules: [{ name: "min", validate: (v) => v >= 0 }] } },
 * });
 * ```
 */
export function validate(data: Record<string, unknown>, schema: ObjectSchema): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const [field, fieldSchema] of Object.entries(schema)) {
    const value = data[field];

    // Required check
    if (fieldSchema.required && isNil(value)) {
      errors.push({ field, message: `"${field}" is required`, code: "required" });
      continue;
    }

    // Skip nil values with defaults
    if (isNil(value)) {
      if (fieldSchema.defaultValue !== undefined) data[field] = fieldSchema.defaultValue;
      continue;
    }

    // Transform
    let processedValue = value;
    if (fieldSchema.transform) {
      try { processedValue = fieldSchema.transform(value); data[field] = processedValue; }
      catch { errors.push({ field, message: `Transform failed for "${field}"`, code: "transform_error", value }); continue; }
    }

    // Rules
    if (fieldSchema.rules) {
      for (const rule of fieldSchema.rules) {
        const result = rule.validate(processedValue, data);
        if (result === true) continue;
        const msg = typeof result === "string" ? result : (rule.message ?? `Validation failed: ${rule.name}`);
        errors.push({ field, message: msg, code: rule.name, value: processedValue });
      }
    }

    // Custom validator
    if (fieldSchema.custom) {
      const customError = fieldSchema.custom(processedValue as never);
      if (customError) errors.push({ field, message: customError, code: "custom", value: processedValue });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Async version of validate — supports async rules */
export async function validateAsync(
  data: Record<string, unknown>,
  schema: ObjectSchema & { asyncRules?: Record<string, (value: unknown, ctx: unknown) => Promise<boolean | string>> },
): Promise<ValidationResult> {
  const syncResult = validate(data, schema as ObjectSchema);
  if (!syncResult.valid) return syncResult;

  const errors: ValidationError[] = [];
  for (const [field, ruleFn] of Object.entries(schema.asyncRules ?? {})) {
    const value = data[field];
    if (isNil(value)) continue;
    const result = await ruleFn(value, data);
    if (result !== true) {
      errors.push({
        field,
        message: typeof result === "string" ? result : `Async validation failed for "${field}"`,
        code: "async",
        value,
      });
    }
  }

  return { valid: errors.length === 0, errors: [...syncResult.errors, ...errors], warnings: syncResult.warnings };
}

// --- Built-in Rules ---

export const rules = {
  /** Value must be a string */
  string: (): ValidationRule => ({ name: "string", validate: isString, message: "Must be a string" }),

  /** Value must be a number */
  number: (): ValidationRule => ({ name: "number", validate: isNumber, message: "Must be a number" }),

  /** Value must be an integer */
  integer: (): ValidationRule => ({ name: "integer", validate: isInteger, message: "Must be an integer" }),

  /** Value must be a boolean */
  boolean: (): ValidationRule => ({ name: "boolean", validate: isBoolean, message: "Must be a boolean" }),

  /** Value must be an array */
  array: (): ValidationRule => ({ name: "array", validate: isArray, message: "Must be an array" }),

  /** Value must be an object */
  object: (): ValidationRule => ({ name: "object", validate: isObject, message: "Must be an object" }),

  /** Value must be a valid email */
  email: (): ValidationRule => ({ name: "email", validate: isEmail, message: "Must be a valid email address" }),

  /** Value must be a URL */
  url: (): ValidationRule => ({ name: "url", validate: isURL, message: "Must be a valid URL" }),

  /** Value must match a pattern */
  pattern: (regex: RegExp, msg?: string): ValidationRule => ({
    name: "pattern",
    validate: (v) => matchesPattern(v, regex),
    message: msg ?? `Must match pattern ${regex}`,
  }),

  /** Minimum value (for numbers) or minimum length (for strings/arrays) */
  min: (limit: number): ValidationRule => ({
    name: "min",
    validate: (v) => {
      if (typeof v === "number") return v >= limit;
      if (typeof v === "string") return v.length >= limit;
      if (Array.isArray(v)) return v.length >= limit;
      return false;
    },
    message: `Minimum value is ${limit}`,
  }),

  /** Maximum value (for numbers) or maximum length (for strings/arrays) */
  max: (limit: number): ValidationRule => ({
    name: "max",
    validate: (v) => {
      if (typeof v === "number") return v <= limit;
      if (typeof v === "string") return v.length <= limit;
      if (Array.isArray(v)) return v.length <= limit;
      return false;
    },
    message: `Maximum value is ${limit}`,
  }),

  /** Value must be one of the given options */
  enum: <T>(options: readonly T[]): ValidationRule => ({
    name: "enum",
    validate: (v) => options.includes(v as T),
    message: `Must be one of: ${options.join(", ")}`,
  }),

  /** Custom rule from a predicate function */
  custom: (fn: (v: unknown) => boolean | string, name = "custom"): ValidationRule => ({
    name,
    validate: fn,
  }),
};

// --- Assertion Helpers ---

/** Assert condition is truthy, throw with message if not */
export function assert(condition: unknown, message = "Assertion failed"): asserts condition {
  if (!condition) throw new Error(message);
}

/** Assert value matches type guard, throw with message if not */
export function assertType<T>(value: unknown, guard: (v: unknown) => v is T, message = "Type assertion failed"): T {
  assert(guard(value), message);
  return value;
}
