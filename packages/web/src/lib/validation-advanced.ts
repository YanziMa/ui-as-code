/**
 * Advanced validation utilities with composable validators.
 */

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export type Validator<T> = (value: T) => ValidationResult;

/** Create a validator that always passes */
export function valid<T>(): Validator<T> {
  return () => ({ valid: true, errors: [] });
}

/** Create a validator that always fails */
export function invalid(message: string): Validator<unknown> {
  return () => ({ valid: false, errors: [message] });
}

/** Required value validator */
export function required(message = "This field is required"): Validator<unknown> {
  return (value) => {
    if (value === null || value === undefined || value === "") {
      return { valid: false, errors: [message] };
    }
    return { valid: true, errors: [] };
  };
}

/** Minimum length validator */
export function minLength(min: number, message?: string): Validator<string> {
  return (value) => {
    if (value.length < min) {
      return { valid: false, errors: [message ?? `Must be at least ${min} characters`] };
    }
    return { valid: true, errors: [] };
  };
}

/** Maximum length validator */
export function maxLength(max: number, message?: string): Validator<string> {
  return (value) => {
    if (value.length > max) {
      return { valid: false, errors: [message ?? `Must be at most ${max} characters`] };
    }
    return { valid: true, errors: [] };
  };
}

/** Range validator for numbers */
export function range(min: number, max: number, message?: string): Validator<number> {
  return (value) => {
    if (value < min || value > max) {
      return { valid: false, errors: [message ?? `Must be between ${min} and ${max}`] };
    }
    return { valid: true, errors: [] };
  };
}

/** Pattern/regex validator */
export function pattern(regex: RegExp, message = "Invalid format"): Validator<string> {
  return (value) => {
    if (!regex.test(value)) {
      return { valid: false, errors: [message] };
    }
    return { valid: true, errors: [] };
  };
}

/** Email validator */
export const emailValidator: Validator<string> = pattern(
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  "Please enter a valid email address",
);

/** URL validator */
export const urlValidator: Validator<string> = pattern(
  /^https?:\/\/.+/,
  "Please enter a valid URL starting with http:// or https://",
);

/** Enum validator — value must be one of allowed values */
export function oneOf<T>(allowed: readonly T[], message?: string): Validator<T> {
  return (value) => {
    if (!allowed.includes(value)) {
      return { valid: false, errors: [message ?? `Must be one of: ${allowed.join(", ")}`] };
    }
    return { valid: true, errors: [] };
  };
}

/** Compose multiple validators — all must pass (AND logic) */
export function allOf<T>(...validators: Validator<T>[]): Validator<T> {
  return (value) => {
    const errors: string[] = [];
    for (const v of validators) {
      const result = v(value);
      if (!result.valid) {
        errors.push(...result.errors);
      }
    }
    return { valid: errors.length === 0, errors };
  };
}

/** Compose validators — at least one must pass (OR logic) */
export function anyOf<T>(...validators: Validator<T>[]): Validator<T> {
  return (value) => {
    const allErrors: string[] = [];
    let anyValid = false;

    for (const v of validators) {
      const result = v(value);
      if (result.valid) {
        anyValid = true;
      } else {
        allErrors.push(...result.errors);
      }
    }

    return anyValid
      ? { valid: true, errors: [] }
      : { valid: false, errors: allErrors };
  };
}

/** Negate a validator */
export function not<T>(validator: Validator<T>, message = "Validation failed"): Validator<T> {
  return (value) => {
    const result = validator(value);
    if (result.valid) {
      return { valid: false, errors: [message] };
    }
    return { valid: true, errors: [] };
  };
}

/** Conditional validator — only apply if condition is met */
export function when<T>(
  condition: (value: T) => boolean,
  thenValidator: Validator<T>,
  elseValidator?: Validator<T>,
): Validator<T> {
  return (value) => {
    if (condition(value)) {
      return thenValidator(value);
    }
    return elseValidator ? elseValidator(value) : { valid: true, errors: [] };
  };
}

/** Validate an object with named field validators */
export interface FieldValidators<T extends Record<string, unknown>> {
  [K in keyof T]?: Validator<T[K]>;
}

export function validateObject<T extends Record<string, unknown>>(
  data: T,
  validators: FieldValidators<T>,
): { valid: boolean; errors: Record<string, string[]> } {
  const errors: Record<string, string[]> = {};

  for (const [field, validator] of Object.entries(validators)) {
    if (validator) {
      const result = (validator as Validator<unknown>)(data[field]);
      if (!result.valid) {
        errors[field] = result.errors;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
