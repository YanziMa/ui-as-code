/**
 * Validation utilities: common validators (email, URL, phone, etc.),
 * composite validation rules, schema-based validation, and
 * error message generation.
 */

// --- Types ---

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field?: string; message: string; value?: unknown }>;
}

export type ValidatorFn = (value: unknown) => string | null | Promise<string | null>;

export interface ValidationRule {
  field: string;
  label?: string;
  validators: ValidatorFn[];
  /** Only run if condition is met */
  when?: () => boolean;
  /** Custom error message prefix */
  errorMessage?: string;
}

// --- Built-in Validators ---

/** Check if value is not empty */
export function required(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return "This field is required";
  if (Array.isArray(value) && value.length === 0) return "This field is required";
  return null;
}

/** Check if value is a valid email */
export function isEmail(value: unknown): string | null {
  if (!value || typeof value !== "string") return null; // Don't fail on empty — use required() for that

  // RFC-compliant-ish email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(value)) return "Please enter a valid email address";
  return null;
}

/** Check if value is a valid URL */
export function isUrl(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;

  try {
    const url = new URL(value);
    // Must have http/https or a known protocol
    if (!["http:", "https:", "ftp:"].includes(url.protocol)) {
      return "URL must start with http:// or https://";
    }
    return null;
  } catch {
    return "Please enter a valid URL";
  }
}

/** Check if value looks like a phone number (flexible) */
export function isPhone(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;

  // Strip all non-digit characters
  const digits = value.replace(/\D/g, "");

  // Accept 7-15 digit numbers (covers most international formats)
  if (digits.length < 7 || digits.length > 15) return "Please enter a valid phone number";
  return null;
}

/** Check minimum length */
export function minLength(min: number): ValidatorFn {
  return (value) => {
    if (!value || typeof value !== "string") return null;
    if (value.length < min) return `Must be at least ${min} characters`;
    return null;
  };
}

/** Check maximum length */
export function maxLength(max: number): ValidatorFn {
  return (value) => {
    if (!value || typeof value !== "string") return null;
    if (value.length > max) return `Must be no more than ${max} characters`;
    return null;
  };
}

/** Check min numeric value */
export function minValue(min: number): ValidatorFn {
  return (value) => {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    if (isNaN(num)) return null; // Let isNumber handle type check
    if (num < min) return `Must be at least ${min}`;
    return null;
  };
}

/** Check max numeric value */
export function maxValue(max: number): ValidatorFn {
  return (value) => {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    if (isNaN(num)) return null;
    if (num > max) return `Must be no more than ${max}`;
    return null;
  };
}

/** Check if value matches a regex pattern */
export function matches(pattern: RegExp, errorMsg = "Format is invalid"): ValidatorFn {
  return (value) => {
    if (!value || typeof value !== "string") return null;
    if (!pattern.test(value)) return errorMsg;
    return null;
  };
}

/** Check if value is one of allowed values */
export function oneOf(allowed: readonly unknown[], label?: string): ValidatorFn {
  const allowedStr = allowed.map(String).join(", ");
  return (value) => {
    if (!allowed.includes(value)) {
      return `Must be one of: ${label ?? allowedStr}`;
    }
    return null;
  };
}

/** Check if value is a number */
export function isNumber(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" && isNaN(Number(value))) return "Must be a number";
  return null;
}

/** Check if value is a boolean-like string */
export function isBoolean(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "boolean" && !["true", "false", "1", "0"].includes(String(value).toLowerCase())) {
    return "Must be true or false";
  }
  return null;
}

/** Check if value is a date string or Date object */
export function isDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? "Invalid date" : null;
  if (typeof value === "string") {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "Invalid date format";
    return null;
  }
  return "Invalid date format";
}

/** Custom validator factory */
export function custom(
  validator: (value: unknown) => boolean | string,
  msg = "Validation failed",
): ValidatorFn {
  return (value) => {
    const result = validator(value);
    if (result === true || result === undefined || result === null) return null;
    if (result === false) return msg;
    if (typeof result === "string") return result;
    return null;
  };
}

// --- Schema Validation ---

/** Validate data against an array of rules */
export async function validate(
  data: Record<string, unknown>,
  rules: ValidationRule[],
): Promise<ValidationResult> {
  const errors: ValidationResult["errors"] = [];

  for (const rule of rules) {
    // Skip conditional rules
    if (rule.when && !rule.when()) continue;

    const value = data[rule.field];
    const label = rule.label ?? rule.field;

    for (const validator of rule.validators) {
      try {
        const error = await validator(value);
        if (error) {
          errors.push({
            field: rule.field,
            message: rule.errorMessage ? `${rule.errorMessage}: ${error}` : error,
            value,
          });
          break; // One error per field per validator is usually enough
        }
      } catch (err) {
        errors.push({
          field: rule.field,
          message: `Validation error: ${err instanceof Error ? err.message : String(err)}`,
          value,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Synchronous validation shortcut */
export function validateSync(
  data: Record<string, unknown>,
  rules: ValidationRule[],
): ValidationResult {
  // Convert async validators to sync by running them and checking result
  const syncRules = rules.map((r) => ({
    ...r,
    validators: r.validators.map((v) => {
      return (val: unknown): string | null => {
        const result = v(val);
        if (result instanceof Promise) return null; // Skip async in sync mode
        return result as string | null;
      };
    }),
  }));

  // We need to return a promise-compatible result but synchronously
  // For simplicity, run sync validation
  const errors: ValidationResult["errors"] = [];

  for (const rule of syncRules) {
    if (rule.when && !rule.when()) continue;
    const value = data[rule.field];

    for (const validator of rule.validators) {
      const error = validator(value);
      if (error) {
        errors.push({ field: rule.field, message: error, value });
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// --- Quick Validators ---

/** Validate a single value against multiple validators */
export function check(
  value: unknown,
  ...validators: ValidatorFn[]
): string | null {
  for (const v of validators) {
    const error = v(value);
    if (error) return error;
  }
  return null;
}
