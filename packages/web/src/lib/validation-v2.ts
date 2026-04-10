/**
 * Schema-based validation library v2: type-safe validators, nested objects,
 * conditional/cross-field/async validation, error formatting, schema composition,
 * type guards, sanitization.
 */

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: Record<string, unknown>;
}

export type ValidatorFn<T = unknown> = (value: T, context: ValidationContext) => string | null;

export interface ValidationContext {
  root: Record<string, unknown>;
  path: string;
  label?: string;
  schema?: Schema;
}

export interface FieldSchema {
  type?: "string" | "number" | "boolean" | "array" | "object" | "date" | "null" | "any";
  required?: boolean;
  default?: unknown;
  validators?: ValidatorFn[];
  fields?: Record<string, FieldSchema>;
  items?: FieldSchema;
  when?: (root: Record<string, unknown>) => boolean;
  message?: string;
  transform?: (value: unknown) => unknown;
  sanitize?: (value: unknown) => unknown;
  enum?: unknown[];
  min?: number;
  max?: number;
  pattern?: RegExp;
  label?: string;
  coerce?: boolean;
  nullable?: boolean;
  dependsOn?: string[];
  asyncValidator?: (value: unknown, context: ValidationContext) => Promise<string | null>;
}

export interface Schema { [key: string]: FieldSchema; }

export function required(message = "This field is required"): ValidatorFn {
  return (value) => { if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return message; return null; };
}

export function typeCheck(type: string): ValidatorFn {
  const checks: Record<string, (v: unknown) => boolean> = {
    string: (v) => typeof v === "string", number: (v) => typeof v === "number" && !isNaN(v),
    boolean: (v) => typeof v === "boolean", array: Array.isArray,
    object: (v) => typeof v === "object" && v !== null && !Array.isArray(v),
    date: (v) => v instanceof Date && !isNaN(v.getTime()), null: (v) => v === null, any: () => true,
  };
  const fn = checks[type] ?? (() => true);
  return (value) => fn(value) ? null : `Expected ${type}, got ${typeof value}`;
}

export function minLength(min: number, msg?: string): ValidatorFn {
  return (value) => typeof value !== "string" ? null : value.length >= min ? null : (msg ?? `Must be at least ${min} characters`);
}
export function maxLength(max: number, msg?: string): ValidatorFn {
  return (value) => typeof value !== "string" ? null : value.length <= max ? null : (msg ?? `Must be no more than ${max} characters`);
}
export function lengthRange(min: number, max: number, msg?: string): ValidatorFn {
  return (value) => typeof value !== "string" ? null : (value.length >= min && value.length <= max) ? null : (msg ?? `Must be between ${min} and ${max} characters`);
}
export function minVal(min: number, msg?: string): ValidatorFn {
  return (value) => typeof value !== "number" ? null : value >= min ? null : (msg ?? `Must be at least ${min}`);
}
export function maxVal(max: number, msg?: string): ValidatorFn {
  return (value) => typeof value !== "number" ? null : value <= max ? null : (msg ?? `Must be no more than ${max}`);
}
export function rangeVal(min: number, max: number, msg?: string): ValidatorFn {
  return (value) => typeof value !== "number" ? null : (value >= min && value <= max) ? null : (msg ?? `Must be between ${min} and ${max}`);
}
export function matchesPattern(pattern: RegExp, msg?: string): ValidatorFn {
  return (value) => typeof value !== "string" ? null : pattern.test(value) ? null : (msg ?? "Does not match required pattern");
}
export function email(msg = "Invalid email address"): ValidatorFn {
  return matchesPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, msg);
}
export function url(protocols = ["http", "https"], msg = "Invalid URL"): ValidatorFn {
  const allowed = protocols.join("|");
  return matchesPattern(new RegExp(`^(${allowed})://[^\s]+$`, "i"), msg);
}
export function oneOf(values: unknown[], msg?: string): ValidatorFn {
  return (value) => values.includes(value) ? null : (msg ?? `Must be one of: ${values.join(", ")}`);
}
export function custom(fn: (value: unknown, ctx: ValidationContext) => string | null): ValidatorFn { return fn; }

export const validations = {
  required: () => required(), email: () => email(), url: () => url(),
  password: (minLen = 8) => [
    minLength(minLen, `Password must be at least ${minLen} characters`),
    matchesPattern(/[A-Z]/, "Must contain uppercase letter"),
    matchesPattern(/[a-z]/, "Must contain lowercase letter"),
    matchesPattern(/\d/, "Must contain a digit"),
    matchesPattern(/[^A-Za-z0-9]/, "Must contain special character"),
  ],
  username: (minLen = 3, maxLen = 20) => [lengthRange(minLen, maxLen), matchesPattern(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores")],
  phone: () => matchesPattern(/^\+?[\d\s\-()]{7,20}$/, "Invalid phone number"),
  creditCard: () => [matchesPattern(/^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/, "Invalid card number"), custom((val) => {
    const digits = String(val).replace(/\D/g, ""); let sum = 0; let alt = false;
    for (let i = digits.length - 1; i >= 0; i--) { let n = parseInt(digits[i]!, 10); if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; }
    return sum % 10 === 0 ? null : "Luhn check failed";
  })],
  ipv4: () => matchesPattern(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IPv4 address"),
  ipv6: () => matchesPattern(/^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/, "Invalid IPv6 address"),
  hexColor: () => matchesPattern(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid hex color"),
  slug: () => matchesPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),
  uuid: () => matchesPattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID format"),
  isoDate: () => matchesPattern(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/, "Invalid ISO date format"),
  json: () => custom((val) => { try { JSON.parse(String(val)); return null; } catch { return "Invalid JSON"; } }),
  base64: () => matchesPattern(/^[A-Za-z0-9+/]*={0,2}$/, "Invalid base64 string"),
  alphanumeric: () => matchesPattern(/^[a-zA-Z0-9]+$/, "Only alphanumeric characters allowed"),
};

export class SchemaBuilder {
  private schema: Schema = {};
  field(name: string, config: FieldSchema): this { this.schema[name] = config; return this; }
  string(name: string, opts?: Partial<FieldSchema>): this { return this.field(name, { type: "string", required: true, ...opts }); }
  number(name: string, opts?: Partial<FieldSchema>): this { return this.field(name, { type: "number", required: true, ...opts }); }
  boolean(name: string, opts?: Partial<FieldSchema>): this { return this.field(name, { type: "boolean", required: true, ...opts }); }
  array(name: string, items: FieldSchema, opts?: Partial<FieldSchema>): this { return this.field(name, { type: "array", items, ...opts }); }
  object(name: string, fields: Record<string, FieldSchema>, opts?: Partial<FieldSchema>): this { return this.field(name, { type: "object", fields, ...opts }); }
  conditional(name: string, config: FieldSchema, cond: (root: Record<string, unknown>) => boolean): this { return this.field(name, { ...config, when: cond }); }
  build(): Schema { return { ...this.schema }; }
}

export function validate(schema: Schema, data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []; const result: Record<string, unknown> = {};
  for (const [fieldName, fc] of Object.entries(schema)) {
    const value = data[fieldName]; const ctx: ValidationContext = { root: data, path: fieldName, label: fc.label || fieldName, schema };
    if (fc.when && !fc.when(data)) continue;
    if ((value === undefined || value === null) && fc.nullable) { result[fieldName] = value; continue; }
    let pv = value; if (fc.transform) { try { pv = fc.transform(value); } catch {} }
    if (fc.coerce && pv !== undefined && pv !== null) { pv = coerceValue(pv, fc.type); }
    if (fc.required && (pv === undefined || pv === null)) { errors.push({ field: fieldName, message: fc.message ?? `${ctx.label} is required`, code: "required", value: pv }); continue; }
    if (!fc.required && (pv === undefined || pv === null)) { result[fieldName] = fc.default ?? pv; continue; }
    if (fc.type) { const e = typeCheck(fc.type)(pv); if (e) { errors.push({ field: fieldName, message: e, code: "type", value: pv }); continue; } }
    if (fc.enum && !fc.enum.includes(pv)) { errors.push({ field: fieldName, message: fc.message ?? `Must be one of: ${fc.enum.join(", ")}`, code: "enum", value: pv }); continue; }
    if (typeof pv === "string") {
      if (fc.min !== undefined) { const e = minLength(fc.min)(pv); if (e) errors.push({ field: fieldName, message: e!, code: "minLength", value: pv }); }
      if (fc.max !== undefined) { const e = maxLength(fc.max)(pv); if (e) errors.push({ field: fieldName, message: e!, code: "maxLength", value: pv }); }
      if (fc.pattern) { const e = matchesPattern(fc.pattern)(pv); if (e) errors.push({ field: fieldName, message: e!, code: "pattern", value: pv }); }
    }
    if (typeof pv === "number") {
      if (fc.min !== undefined) { const e = minVal(fc.min)(pv); if (e) errors.push({ field: fieldName, message: e!, code: "min", value: pv }); }
      if (fc.max !== undefined) { const e = maxVal(fc.max)(pv); if (e) errors.push({ field: fieldName, message: e!, code: "max", value: pv }); }
    }
    if (Array.isArray(pv)) {
      if (fc.min !== undefined && pv.length < fc.min) errors.push({ field: fieldName, message: `Minimum ${fc.min} items required`, code: "minItems", value: pv.length });
      if (fc.max !== undefined && pv.length > fc.max) errors.push({ field: fieldName, message: `Maximum ${fc.max} items allowed`, code: "maxItems", value: pv.length });
      if (fc.items) pv.forEach((item, idx) => { runV(fc.items, item, { ...ctx, path: `${fieldName}[${idx}]`, label: `${ctx.label}[${idx}]` }, errors); });
    }
    if (fc.fields && typeof pv === "object" && pv !== null && !Array.isArray(pv)) {
      const nr = validate(fc.fields, pv as Record<string, unknown>);
      if (!nr.valid) errors.push(...nr.errors.map((e) => ({ ...e, field: `${fieldName}.${e.field}` })));
    }
    if (fc.validators) { for (const v of fc.validators) { const e = v(pv, ctx); if (e) { errors.push({ field: fieldName, message: e, code: "custom", value: pv }); break; } } }
    if (fc.sanitize) { try { pv = fc.sanitize(pv); } catch {} }
    result[fieldName] = pv;
  }
  return { valid: errors.length === 0, errors, data: errors.length === 0 ? result : undefined };
}

function runV(c: FieldSchema, val: unknown, cx: ValidationContext, errs: ValidationError[]): void {
  if (c.required && (val === undefined || val === null)) { errs.push({ field: cx.path, message: "Required", code: "required", value: val }); return; }
  if (c.type) { const e = typeCheck(c.type)(val); if (e) errs.push({ field: cx.path, message: e, code: "type", value: val }); }
  if (c.validators) { for (const v of c.validators) { const e = v(val, cx); if (e) errs.push({ field: cx.path, message: e, code: "custom", value: val }); } }
}

export async function validateAsync(schema: Schema, data: Record<string, unknown>): Promise<ValidationResult> {
  const sr = validate(schema, data); if (!sr.valid) return sr;
  const ae: ValidationError[] = [];
  for (const [fn, fc] of Object.entries(schema)) { if (fc.asyncValidator) { const cx: ValidationContext = { root: data, path: fn, label: fc.label || fn, schema }; const er = await fc.asyncValidator(data[fn], cx); if (er) ae.push({ field: fn, message: er, code: "async", value: data[fn] }); } }
  return ae.length > 0 ? { valid: false, errors: [...sr.errors, ...ae], data: sr.data } : sr;
}

function coerceValue(v: unknown, t?: string): unknown {
  if (!t) return v;
  switch (t) { case "number": return typeof v === "number" ? v : parseFloat(String(v)); case "boolean": return v === true || v === "false" ? false : Boolean(v); case "string": return String(v ?? ""); case "date": return v instanceof Date ? v : new Date(String(v)); default: return v; }
}

export function formatErrors(errors: ValidationError[]): Record<string, string> { const m: Record<string, string> = {}; for (const e of errors) m[e.field] = e.message; return m; }
export function formatErrorString(errors: ValidationError[], sep = "; "): string { return errors.map((e) => `${e.field}: ${e.message}`).join(sep); }
export function getFirstError(errors: ValidationError[]): string | null { return errors[0]?.message ?? null; }
export function groupErrorsByField(errors: ValidationError[]): Record<string, ValidationError[]> { const g: Record<string, ValidationError[]> = {}; for (const e of errors) (g[e.field] ??= []).push(e); return g; }
export function filterErrorsByCode(errors: ValidationError[], code: string): ValidationError[] { return errors.filter((e) => e.code === code); }

export function isValidString(v: unknown): v is string { return typeof v === "string"; }
export function isValidNumber(v: unknown): v is number { return typeof v === "number" && !isNaN(v); }
export function isValidBoolean(v: unknown): v is boolean { return typeof v === "boolean"; }
export function isArray<T = unknown>(v: unknown): v is T[] { return Array.isArray(v); }
export function isObject(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }
export function isDate(v: unknown): v is Date { return v instanceof Date && !isNaN(v.getTime()); }
export function isEmpty(v: unknown): boolean { if (v == null) return true; if (typeof v === "string") return v.trim().length === 0; if (Array.isArray(v)) return v.length === 0; if (typeof v === "object") return Object.keys(v).length === 0; return false; }
export function isNonEmptyString(v: unknown): v is string { return typeof v === "string" && v.trim().length > 0; }

export function stripHtml(s: string): string { return s.replace(/<[^>]*>/g, ""); }
export function trimInput(s: string): string { return s.trim(); }
export function normalizeWhitespace(s: string): string { return s.replace(/\s+/g, " ").trim(); }
export function escapeRegex(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
export function sanitizeControlChars(s: string): string { return s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, ""); }
export function sanitizeXss(s: string): string { return s.replace(/javascript:/gi, "").replace(/on\w+\s*=/gi, "").replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ""); }

export function mergeSchemas(...schemas: Schema[]): Schema { return schemas.reduce((a, s) => ({ ...a, ...s }), {}); }
export function pickFields(schema: Schema, fields: string[]): Schema { const p: Schema = {}; for (const f of fields) if (schema[f]) p[f] = schema[f]!; return p; }
export function omitFields(schema: Schema, fields: string[]): Schema { const o = { ...schema }; for (const f of fields) delete o[f]; return o; }
export function partialSchema(schema: Schema): Schema { const p: Schema = {}; for (const [k, v] of Object.entries(schema)) p[k] = { ...v, required: false }; return p; }
export function extendSchema(base: Schema, ext: Schema): Schema { return { ...base, ...ext }; }
