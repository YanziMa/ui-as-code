/**
 * Form Validator Utilities: Declarative form validation with rules, async
 * validators, real-time feedback, custom error messages, and field-level
 * or form-level validation modes.
 */

// --- Types ---

export type ValidationRule =
  | "required"
  | "email"
  | "url"
  | "minLength"
  | "maxLength"
  | "pattern"
  | "number"
  | "integer"
  | "min"
  | "max"
  | "custom";

export interface FieldRule {
  /** Rule type */
  rule: ValidationRule;
  /** Rule-specific value (e.g., minLength: 3, pattern: regex) */
  value?: number | string | RegExp;
  /** Custom error message override */
  message?: string;
  /** Custom validator function (for "custom" rule) */
  validator?: (value: string, formData?: Record<string, string>) => boolean | string | Promise<boolean | string>;
}

export interface FieldConfig {
  /** Field name/ID */
  name: string;
  /** Display label */
  label?: string;
  /** HTML input element */
  element: HTMLElement;
  /** Validation rules */
  rules: FieldRule[];
  /** Show error inline below field? */
  showInlineError?: boolean;
  /** Validate on blur? (default true) */
  validateOnBlur?: boolean;
  /** Validate on input? (default false) */
  validateOnInput?: boolean;
  /** Custom error element selector */
  errorEl?: HTMLElement;
  /** Called when field becomes valid */
  onValid?: () => void;
  /** Called when field becomes invalid */
  onInvalid?: (errors: string[]) => void;
}

export interface FormValidatorOptions {
  /** Array of field configs */
  fields: FieldConfig[];
  /** Show summary errors at top? */
  showSummary?: boolean;
  /** Summary container element */
  summaryContainer?: HTMLElement;
  /** Called when entire form is valid */
  onValid?: () => void;
  /** Called when form has errors */
  onInvalid?: (errors: Record<string, string[]>) => void;
  /** Custom class name */
  className?: string;
}

export interface ValidationResult {
  /** Whether the form is valid */
  valid: boolean;
  /** Errors keyed by field name */
  errors: Record<string, string[]>;
  /** Error count */
  errorCount: number;
  /** Per-field results */
  fieldResults: Map<string, { valid: boolean; errors: string[] }>;
}

export interface FormValidatorInstance {
  /** Root element (if created) or null */
  el: HTMLElement | null;
  /** Validate a single field by name */
  validateField: (name: string) => Promise<{ valid: boolean; errors: string[] }>;
  /** Validate all fields */
  validateAll: () => Promise<ValidationResult>;
  /** Get current validation state */
  getState: () => ValidationResult;
  /** Add a field dynamically */
  addField: (config: FieldConfig) => void;
  /** Remove a field */
  removeField: (name: string) => void;
  /** Reset all error states */
  resetErrors: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Built-in Validators ---

const VALIDATORS: Record<ValidationRule, (value: string, val?: number | string | RegExp, formData?: Record<string, string>) => string | null> = {
  required: (v) => (!v || v.trim() === "" ? "This field is required" : null),
  email: (v) => /^[^\s]*[^@\s]+@[^@\s]+\.[^@\s]+\s*$/.test(v) ? null : "Please enter a valid email address",
  url: (v) => {
    try { new URL(v); return null; } catch { return "Please enter a valid URL"; }
  },
  minLength: (v, min) => v.length < (min as number) ? `Must be at least ${min} characters` : null,
  maxLength: (v, max) => v.length > (max as number) ? `Must be at most ${max} characters` : null,
  pattern: (v, pat) => (pat instanceof RegExp ? pat : new RegExp(pat as string)).test(v) ? null : "Format does not match",
  number: (v) => isNaN(Number(v)) ? "Please enter a valid number" : null,
  integer: (v) => !/^-?\d+$/.test(v) ? "Please enter a whole number" : null,
  min: (v, min) => Number(v) < (min as number) ? `Value must be at least ${min}` : null,
  max: (v, max) => Number(v) > (max as number) ? `Value must be at most ${max}` : null,
  custom: (v, _val, _fd, rule) => {
    const r = rule as FieldRule;
    if (r.validator) {
      const result = r.validator(v, _fd);
      if (result === true || result === undefined) return null;
      if (result === false) return "Validation failed";
      return typeof result === "string" ? result : null;
    }
    return null;
  },
};

// --- Core Factory ---

/**
 * Create a form validator.
 *
 * @example
 * ```ts
 * const validator = createFormValidator({
 *   fields: [
 *     { name: "email", element: emailInput, rules: [{ rule: "required" }, { rule: "email" }] },
 *     { name: "age", element: ageInput, rules: [{ rule: "integer", min: 0, max: 120 }] },
 *   ],
 *   onValid: () => submitForm(),
 * });
 * ```
 */
export function createFormValidator(options: FormValidatorOptions): FormValidatorInstance {
  const {
    fields,
    showSummary = true,
    summaryContainer,
    onValid,
    onInvalid,
    className,
  } = options;

  const fieldMap = new Map<string, FieldConfig>();
  const errorElements = new Map<string, HTMLElement>();
  let cleanupFns: Array<() => void> = [];

  // Register fields
  for (const f of fields) {
    fieldMap.set(f.name, f);

    // Create error element if needed
    if (f.showInlineError !== false && !f.errorEl) {
      const errEl = document.createElement("div");
      errEl.className = `field-error error-${f.name}`;
      errEl.style.cssText =
        "font-size:12px;color:#ef4444;margin-top:4px;display:none;line-height:1.4;";
      errEl.setAttribute("role", "alert");
      f.element.parentNode?.insertBefore(errEl, f.element.nextSibling);
      errorElements.set(f.name, errEl);
    }

    // Bind events
    if (f.validateOnBlur !== false) {
      f.element.addEventListener("blur", () => validateField(f.name));
    }
    if (f.validateOnInput) {
      f.element.addEventListener("input", () => validateField(f.name));
    }

    // Clear error on input
    f.element.addEventListener("input", () => clearFieldError(f.name));
  }

  // Summary container
  let summaryEl: HTMLElement | null = summaryContainer ?? null;

  if (showSummary && !summaryEl) {
    summaryEl = document.createElement("div");
    summaryEl.className = "form-validation-summary";
    summaryEl.style.cssText =
      "background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;" +
      "margin-bottom:16px;display:none;font-size:13px;color:#991b1b;";
    summaryEl.setAttribute("role", "alert");

    if (fields[0]?.element?.parentElement) {
      fields[0].element.parentElement.insertBefore(summaryEl, fields[0].element);
    }
  }

  // --- Internal ---

  function showError(name: string, errors: string[]): void {
    const cfg = fieldMap.get(name);
    if (!cfg) return;

    // Inline error
    const errEl = errorElements.get(name) ?? cfg.errorEl;
    if (errEl) {
      errEl.innerHTML = errors.map((e) => `<div>${e}</div>`).join("");
      errEl.style.display = "";
    }

    // Mark field
    cfg.element.setAttribute("aria-invalid", "true");
    cfg.element.style.borderColor = "#fecaca";

    cfg.onInvalid?.(errors);
  }

  function clearFieldError(name: string): void {
    const cfg = fieldMap.get(name);
    if (!cfg) return;

    const errEl = errorElements.get(name) ?? cfg.errorEl;
    if (errEl) {
      errEl.innerHTML = "";
      errEl.style.display = "none";
    }

    cfg.element.removeAttribute("aria-invalid");
    cfg.element.style.borderColor = "";
    cfg.onValid?.();
  }

  function updateSummary(errors: Record<string, string[]>): void {
    if (!summaryEl) return;

    const entries = Object.entries(errors).filter(([, e]) => e.length > 0);

    if (entries.length === 0) {
      summaryEl.style.display = "none";
      return;
    }

    summaryEl.style.display = "";
    const list = entries.flatMap(([name, errs]) =>
      errs.map((e) => `<div><strong>${name}:</strong> ${e}</div>`),
    );
    summaryEl.innerHTML = `<strong>Please fix the following:</strong>${list.join("")}`;
  }

  // --- Public API ---

  async function validateField(name: string): Promise<{ valid: boolean; errors: string[] }> {
    const cfg = fieldMap.get(name);
    if (!cfg) return { valid: true, errors: [] };

    const el = cfg.element;
    const value = ("value" in el ? (el as HTMLInputElement).value : el.textContent ?? "") as string;
    const errors: string[] = [];

    for (const rule of cfg.rules) {
      const validator = VALIDATORS[rule.rule];
      if (!validator) continue;

      const result = validator(value, rule.value, undefined, rule);
      if (result) {
        errors.push(rule.message ?? result);
      }
    }

    if (errors.length > 0) {
      showError(name, errors);
      return { valid: false, errors };
    }

    clearFieldError(name);
    return { valid: true, errors: [] };
  }

  async function validateAll(): Promise<ValidationResult> {
    const allErrors: Record<string, string[]> = {};
    const fieldResults = new Map<string, { valid: boolean; errors: string[] }>();

    for (const [name] of fieldMap) {
      const result = await validateField(name);
      fieldResults.set(name, result);
      if (!result.valid && result.errors.length > 0) {
        allErrors[name] = result.errors;
      }
    }

    const errorCount = Object.values(allErrors).reduce((sum, e) => sum + e.length, 0);
    const valid = errorCount === 0;

    updateSummary(allErrors);

    if (valid) onValid?.();
    else onInvalid?.(allErrors);

    return { valid, errors: allErrors, errorCount, fieldResults };
  }

  function getState(): ValidationResult {
    const fieldResults = new Map<string, { valid: boolean; errors: string[] }>();
    let totalErrors = 0;
    const errors: Record<string, string[]> = {};

    for (const [name, cfg] of fieldMap) {
      const errEl = errorElements.get(name) ?? cfg.errorEl;
      const hasError = errEl && errEl.style.display !== "none";
      const errs = hasError
        ? Array.from(errEl.children).map((c) => c.textContent!)
        : [];

      if (errs.length > 0) {
        fieldResults.set(name, { valid: false, errors });
        errors[name] = errs;
        totalErrors += errs.length;
      } else {
        fieldResults.set(name, { valid: true, errors: [] });
      }
    }

    return { valid: totalErrors === 0, errors, errorCount: totalErrors, fieldResults };
  }

  function addField(config: FieldConfig): void {
    fieldMap.set(config.name, config);

    if (config.showInlineError !== false && !config.errorEl) {
      const errEl = document.createElement("div");
      errEl.className = `field-error error-${config.name}`;
      errEl.style.cssText =
        "font-size:12px;color:#ef4444;margin-top:4px;display:none;";
      config.element.parentNode?.insertBefore(errEl, config.element.nextSibling);
      errorElements.set(config.name, errEl);
    }

    if (config.validateOnBlur !== false) {
      config.element.addEventListener("blur", () => validateField(config.name));
    }
    if (config.validateOnInput) {
      config.element.addEventListener("input", () => validateField(config.name));
    }
    config.element.addEventListener("input", () => clearFieldError(config.name));
  }

  function removeField(name: string): void {
    fieldMap.delete(name);
    const errEl = errorElements.get(name);
    if (errEl) errEl.remove();
    errorElements.delete(name);
  }

  function resetErrors(): void {
    for (const [name] of fieldMap) {
      clearFieldError(name);
    }
    if (summaryEl) summaryEl.style.display = "none";
  }

  function destroy(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
    if (summaryEl && !summaryContainer) summaryEl.remove();
  }

  return {
    el: summaryEl,
    validateField, validateAll, getState,
    addField, removeField, resetErrors, destroy,
  };
}
