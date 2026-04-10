/**
 * Schema validation utilities: field validators (email, URL, phone, credit card,
 * IBAN, IP, MAC, UUID, semver, etc.), cross-field validation, async validation,
 * rule composition, custom error messages, and form-level validation orchestration.
 */

// --- Types ---

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface FieldValidationResult {
  valid: boolean;
  error?: string;
  value: unknown;
}

export interface ValidationRule {
  name: string;
  validate: (value: unknown) => boolean | Promise<boolean>;
  message: string;
  /** Run only if this condition is true */
  when?: () => boolean;
  /** Skip if this condition is true */
  unless?: () => boolean;
}

export interface AsyncValidationRule extends ValidationRule {
  validate: (value: unknown) => Promise<boolean>;
}

export interface FormValidationContext {
  values: Record<string, unknown>;
  fields: Record<string, FieldValidationResult>;
  touched: Set<string>;
}

// --- Built-in Validators ---

/** Email validation (RFC 5322 compliant-ish) */
export function isValidEmail(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  // Practical email regex
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
    value.trim(),
  );
}

/** URL validation */
export function isValidUrl(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

/** Phone number validation (E.164 format or flexible) */
export function isValidPhone(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const cleaned = value.replace(/[\s\-().+]/g, "");
  // E.164: +[country code][number], 7-15 digits
  return /^\+?[1-9]\d{6,14}$/.test(cleaned);
}

/** Credit card number validation (Luhn algorithm + format check) */
export function isValidCreditCard(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const cleaned = value.replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(cleaned)) return false;

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]!, 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/** Detect credit card type from number */
export function detectCardType(number: string): string | null {
  const patterns: Array<[RegExp, string]> = [
    [/^4/, "Visa"],
    [/^5[1-5]/, "Mastercard"],
    [/^3[47]/, "American Express"],
    [/^3(?:0[0-5]|[68])/, "Diners Club"],
    [/^6(?:011|5)/, "Discover"],
    [/^(?:2131|1800|35\d{3})/, "JCB"],
  ];

  for (const [pattern, type] of patterns) {
    if (pattern.test(number.replace(/\s/g, ""))) return type;
  }
  return null;
}

/** IBAN validation */
export function isValidIban(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const cleaned = value.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(cleaned)) return false;

  // Move first 4 chars to end
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  // Convert letters to numbers (A=10, B=11, ...)
  const numeric = rearranged
    .split("")
    .map((c) => (/[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c))
    .join("");

  // Modulo 97
  let remainder = "";
  for (const digit of numeric) {
    remainder = String(BigInt(remainder + digit) % BigInt(97));
  }
  return remainder === "1";
}

/** IPv4 address validation */
export function isValidIPv4(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = parseInt(p, 10);
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

/** IPv6 address validation */
export function isValidIPv6(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  // Full or compressed form
  return /^(?:(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}|::(?:[a-fA-F0-9]{1,4}:){0,6}[a-fA-F0-9]{1,4}|(?:[a-fA-F0-9]{1,4}:){1,7}:|(?:[a-fA-F0-9]{1,4}:){1,6}:(?:[a-fA-F0-9]{1,4}:){0,1}[a-fA-F0-9]{1,4}|(?:[a-fA-F0-9]{1,4}:){1,5}(?::[a-fA-F0-9]{1,4}){1,2}|(?:[a-fA-F0-9]{1,4}:){1,4}(?::[a-fA-F0-9]{1,4}){1,3}|(?:[a-fA-F0-9]{1,4}:){1,3}(?::[a-fA-F0-9]{1,4}){1,4}|(?:[a-fA-F0-9]{1,4}:){1,2}(?::[a-fA-F0-9]{1,4}){1,5}|[a-fA-F0-9]{1,4}:(?::[a-fA-F0-9]{1,4}){1,6}|:(?::[a-fA-F0-9]{1,4}){1,7}|fe80:(?::[a-fA-F0-9]{0,4}){0,4}%[0-9a-zA-Z]+|::(?:ffff(?::0{1,4})?:)?(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|[a-fA-F0-9]{1,4}:(?::[a-fA-F0-9]{1,4}){1,5}$/.test(
    value,
  );
}

/** IP address (v4 or v6) validation */
export function isValidIP(value: string): boolean {
  return isValidIPv4(value) || isValidIPv6(value);
}

/** MAC address validation */
export function isValidMacAddress(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(value.trim());
}

/** UUID validation (all versions) */
export function isValidUuid(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** UUID v4 specific validation */
export function isValidUuidV4(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Semantic version validation */
export function isValidSemver(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(
    value,
  );
}

/** Parse semver into components */
export function parseSemver(value: string): { major: number; minor: number; patch: number; prerelease?: string; build?: string } | null {
  if (!isValidSemver(value)) return null;
  const match = value.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(.+))?(?:\+(.+))?$/);
  if (!match) return null;
  return {
    major: parseInt(match[1]!, 10),
    minor: parseInt(match[2]!, 10),
    patch: parseInt(match[3]!, 10),
    prerelease: match[5],
    build: match[6],
  };
}

/** Compare two semver strings (-1, 0, 1) */
export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a), pb = parseSemver(b);
  if (!pa || !pb) throw new Error("Invalid semver");
  for (const key of ["major", "minor", "patch"] as const) {
    if (pa[key] < pb[key]) return -1;
    if (pa[key] > pb[key]) return 1;
  }
  return 0;
}

/** Slug validation (URL-friendly identifier) */
export function isValidSlug(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/** Hex color validation */
export function isValidHexColor(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  return /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);
}

/** Password strength scoring */
export interface PasswordStrengthResult {
  score: number;        // 0-4
  label: string;       // "Very Weak" to "Strong"
  suggestions: string[];
}

export function validatePassword(password: string, options?: { minLength?: number; requireUppercase?: boolean; requireLowercase?: boolean; requireNumbers?: boolean; requireSpecial?: boolean }): PasswordStrengthResult {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecial = true,
  } = options ?? {};

  const suggestions: string[] = [];
  let score = 0;

  if (password.length < minLength) {
    suggestions.push(`At least ${minLength} characters`);
  } else {
    score++;
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    suggestions.push("At least one uppercase letter");
  } else if (requireUppercase) {
    score++;
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    suggestions.push("At least one lowercase letter");
  } else if (requireLowercase) {
    score++;
  }

  if (requireNumbers && !/\d/.test(password)) {
    suggestions.push("At least one number");
  } else if (requireNumbers) {
    score++;
  }

  if (requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    suggestions.push("At least one special character");
  } else if (requireSpecial) {
    score++;
  }

  // Bonus for length
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];

  return {
    score: Math.min(score, 4),
    label: labels[Math.min(score, 4)],
    suggestions,
  };
}

// --- Rule Composition ---

/** Validate a value against multiple rules */
export function validateRules(value: unknown, rules: ValidationRule[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    // Check conditions
    if (rule.when && !rule.when()) continue;
    if (rule.unless && rule.unless()) continue;

    try {
      const result = rule.validate(value);
      if (result instanceof Promise) continue; // Handle async separately

      if (!result) {
        errors.push(rule.message);
      }
    } catch {
      errors.push(`${rule.name}: validation error`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Validate against rules asynchronously */
export async function validateRulesAsync(value: unknown, rules: Array<ValidationRule | AsyncValidationRule>): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    if (rule.when && !rule.when()) continue;
    if (rule.unless && !rule.unless()) continue;

    try {
      const result = await rule.validate(value);
      if (!result) {
        errors.push(rule.message);
      }
    } catch {
      errors.push(`${rule.name}: validation error`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Create a reusable validator from rules */
export function createValidator(rules: ValidationRule[]) {
  return (value: unknown) => validateRules(value, rules);
}

/** Compose validators with AND logic (all must pass) */
export function allOf(...validators: ((value: unknown) => ValidationResult)[]): (value: unknown) => ValidationResult {
  return (value) => {
    const results = validators.map((v) => v(value));
    const errors = results.flatMap((r) => r.errors);
    return { valid: errors.length === 0, errors };
  };
}

/** Compose validators with OR logic (at least one must pass) */
export function anyOf(...validators: ((value: unknown) => ValidationResult)[]): (value: unknown) => ValidationResult {
  return (value) => {
    const results = validators.map((v) => v(value));
    const anyValid = results.some((r) => r.valid);
    if (anyValid) return { valid: true, errors: [] };
    return { valid: false, errors: ["Value does not match any allowed pattern"] };
  };
}

// --- Common Rule Factories ---

/** Required field rule */
export function required(message = "This field is required"): ValidationRule {
  return {
    name: "required",
    validate: (v) => v !== undefined && v !== null && v !== "",
    message,
  };
}

/** Minimum length rule */
export function minLength(min: number, message?: string): ValidationRule {
  return {
    name: "minLength",
    validate: (v) => typeof v === "string" && v.length >= min,
    message: message ?? `Must be at least ${min} characters`,
  };
}

/** Maximum length rule */
export function maxLength(max: number, message?: string): ValidationRule {
  return {
    name: "maxLength",
    validate: (v) => typeof v === "string" && v.length <= max,
    message: message ?? `Must be no more than ${max} characters`,
  };
}

/** Range rule (inclusive) */
export function range(min: number, max: number, message?: string): ValidationRule {
  return {
    name: "range",
    validate: (v) => typeof v === "number" && v >= min && v <= max,
    message: message ?? `Must be between ${min} and ${max}`,
  };
}

/** Pattern / regex rule */
export function pattern(regex: RegExp, message = "Format is invalid"): ValidationRule {
  return {
    name: "pattern",
    validate: (v) => typeof v === "string" && regex.test(v),
    message,
  };
}

/** Enum / one-of rule */
export function oneOf<T>(allowed: T[], message?: string): ValidationRule {
  return {
    name: "oneOf",
    validate: (v) => allowed.includes(v as T),
    message: message ?? `Must be one of: ${allowed.join(", ")}`,
  };
}

/** Email rule */
export function email(message = "Invalid email address"): ValidationRule {
  return {
    name: "email",
    validate: (v) => isValidEmail(String(v)),
    message,
  };
}

/** URL rule */
export function url(message = "Invalid URL"): ValidationRule {
  return {
    name: "url",
    validate: (v) => isValidUrl(String(v)),
    message,
  };
}

/** Custom rule factory */
export function custom(name: string, fn: (v: unknown) => boolean, message: string): ValidationRule {
  return { name, validate: fn, message };
}

// --- Cross-field Validation ---

/** Validate that two fields match (e.g., password confirmation) */
export function fieldsMatch(fieldA: string, fieldB: string, message = "Fields do not match"): (ctx: FormValidationContext) => ValidationResult {
  return (ctx) => {
    if (ctx.values[fieldA] !== ctx.values[fieldB]) {
      return { valid: false, errors: [message] };
    }
    return { valid: true, errors: [] };
  };
}

/** Validate that one field is greater than another */
export function fieldGreaterThan(fieldA: string, fieldB: string, message = "Must be greater"): (ctx: FormValidationContext) => ValidationResult {
  return (ctx) => {
    const a = Number(ctx.values[fieldA]);
    const b = Number(ctx.values[fieldB]);
    if (isNaN(a) || isNaN(b) || a <= b) {
      return { valid: false, errors: [message] };
    }
    return { valid: true, errors: [] };
  };
}

/** Conditional validation: only run rules if another field has a specific value */
export function whenField(conditionField: string, conditionValue: unknown, rules: ValidationRule[]): (ctx: FormValidationContext) => ValidationResult {
  return (ctx) => {
    if (ctx.values[conditionField] !== conditionValue) {
      return { valid: true, errors: [] };
    }
    return validateRules(ctx.values[conditionField] ?? "", rules);
  };
}
