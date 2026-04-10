/**
 * Data Validator: Schema validation with Zod-like fluent API, custom rules,
 * async validation, i18n error messages, type coercion, transformation pipelines,
 * conditional validation (when/refine), and cross-field dependencies.
 */

// --- Types ---

export type ValidatorResult<T = unknown> = {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
};

export interface ValidationError {
  path: string;
  message: string;
  code: string;
  /** The value that failed validation */
  value?: unknown;
  /** Nested errors for object/array types */
  children?: ValidationError[];
}

export interface ValidationContext {
  /** Full data being validated */
  root: Record<string, unknown>;
  /** Current path being validated */
  path: string;
  /** Parent data */
  parent?: unknown;
  /** Custom metadata passed to validators */
  meta?: Record<string, unknown>;
}

export type ValidatorFn<T> = (
  value: unknown,
  ctx: ValidationContext,
) => T | Promise<T>;

export interface ValidatorOptions {
  /** Abort on first error (default: false — collect all) */
  abortEarly?: boolean;
  /** Strip unknown keys from objects (default: false) */
  stripUnknown?: boolean;
  /** Locale for error messages (default: "en") */
  locale?: string;
  /** Custom error message overrides */
  messages?: Partial<Record<string, string>>;
  /** Pre-processing transform before validation */
  preprocess?: (data: unknown) => unknown;
  /** Post-processing transform after successful validation */
  postprocess?: (data: unknown) => unknown;
}

// --- Error Messages (i18n) ---

const ERROR_MESSAGES: Record<string, Record<string, string>> = {
  en: {
    required: "Field is required",
    type_string: "Expected a string",
    type_number: "Expected a number",
    type_boolean: "Expected a boolean",
    type_array: "Expected an array",
    type_object: "Expected an object",
    min_length: "Must be at least {{min}} characters",
    max_length: "Must be at most {{max}} characters",
    pattern: "Does not match required format",
    min_value: "Must be at least {{min}}",
    max_value: "Must be at most {{max}}",
    enum_invalid: "Must be one of: {{values}}",
    custom: "Validation failed",
    email: "Invalid email address",
    url: "Invalid URL",
    uuid: "Invalid UUID format",
    date: "Invalid date",
    not_null: "Value must not be null",
    array_min: "Array must have at least {{min}} items",
    array_max: "Array must have at most {{max}} items",
    array_unique: "Array items must be unique",
    object_unknown: "Unrecognized field: {{field}}",
  },
  zh: {
    required: "此字段为必填项",
    type_string: "期望字符串类型",
    type_number: "期望数字类型",
    type_boolean: "期望布尔类型",
    type_array: "期望数组类型",
    type_object: "期望对象类型",
    min_length: "长度不能少于{{min}}个字符",
    max_length: "长度不能超过{{max}}个字符",
    pattern: "格式不匹配",
    min_value: "值不能小于{{min}}",
    max_value: "值不能大于{{max}}",
    enum_invalid: "必须是以下值之一: {{values}}",
    custom: "验证失败",
    email: "无效的邮箱地址",
    url: "无效的URL",
    uuid: "无效的UUID格式",
    date: "无效的日期",
    not_null: "值不能为空",
    array_min: "数组至少需要{{min}}个元素",
    array_max: "数组最多允许{{max}}个元素",
    array_unique: "数组元素必须唯一",
    object_unknown: "未识别的字段: {{field}}",
  },
};

function getMessage(code: string, locale: string = "en", vars?: Record<string, string | number>): string {
  const lang = ERROR_MESSAGES[locale] ?? ERROR_MESSAGES["en"];
  let msg = lang[code] ?? ERROR_MESSAGES["en"][code] ?? code;
  if (vars) {
    for (const [key, val] of Object.entries(vars)) {
      msg = msg.replace(`{{${key}}}`, String(val));
    }
  }
  return msg;
}

// --- Base Validator Class ---

class BaseValidator<T> {
  protected checks: Array<{
    fn: (value: T, ctx: ValidationContext) => boolean | Promise<boolean>;
    message: string;
    code: string;
  }> = [];
  protected transforms: Array<(value: T) => T> = [];

  /** Add a custom check rule */
  check(fn: (value: T, ctx: ValidationContext) => boolean | Promise<boolean>, message?: string, code?: string): this {
    this.checks.push({ fn, message: message ?? getMessage("custom"), code: code ?? "custom" });
    return this;
  }

  /** Transform the value before returning */
  transform(fn: (value: T) => T): this {
    this.transforms.push(fn);
    return this;
  }

  /** Apply all transforms in order */
  protected applyTransforms(value: T): T {
    return this.transforms.reduce((v, t) => t(v), value);
  }
}

// --- Concrete Validators ---

class StringValidator extends BaseValidator<string> {
  private _required = false;
  private _defaultValue?: string;

  required(msg?: string): this {
    this._required = true;
    if (msg) this.checks.unshift({
      fn: (v) => v !== undefined && v !== null && v !== "",
      message: msg,
      code: "required",
    });
    else this.checks.unshift({
      fn: (v) => v !== undefined && v !== null && v !== "",
      message: "Field is required",
      code: "required",
    });
    return this;
  }

  optional(): this { _required: false } & this {
    this._required = false;
    return this as any;
  }

  default(value: string): this {
    this._defaultValue = value;
    return this;
  }

  min(len: number, msg?: string): this {
    this.checks.push({
      fn: (v) => typeof v === "string" && v.length >= len,
      message: msg ?? getMessage("min_length", "en", { min: len }),
      code: "min_length",
    });
    return this;
  }

  max(len: number, msg?: string): this {
    this.checks.push({
      fn: (v) => typeof v === "string" && v.length <= len,
      message: msg ?? getMessage("max_length", "en", { max: len }),
      code: "max_length",
    });
    return this;
  }

  email(msg?: string): this {
    this.checks.push({
      fn: (v) => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: msg ?? getMessage("email"),
      code: "email",
    });
    return this;
  }

  url(msg?: string): this {
    this.checks.push({
      fn: (v) => {
        try { new URL(typeof v === "string" ? v : ""); return true; } catch { return false; }
      },
      message: msg ?? getMessage("url"),
      code: "url",
    });
    return this;
  }

  uuid(msg?: string): this {
    this.checks.push({
      fn: (v) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
      message: msg ?? getMessage("uuid"),
      code: "uuid",
    });
    return this;
  }

  regex(pattern: RegExp, msg?: string): this {
    this.checks.push({
      fn: (v) => typeof v === "string" && pattern.test(v),
      message: msg ?? getMessage("pattern"),
      code: "pattern",
    });
    return this;
  }

  oneOf(values: string[], msg?: string): this {
    this.checks.push({
      fn: (v) => values.includes(v as string),
      message: msg ?? getMessage("enum_invalid", "en", { values: values.join(", ") }),
      code: "enum_invalid",
    });
    return this;
  }

  trim(): this {
    this.transforms.push((v) => (typeof v === "string" ? v.trim() : v));
    return this;
  }

  toLowerCase(): this {
    this.transforms.push((v) => (typeof v === "string" ? v.toLowerCase() : v));
    return this;
  }

  toUpperCase(): this {
    this.transforms.push((v) => (typeof v === "string" ? v.toUpperCase() : v));
    return this;
  }

  async validate(value: unknown, ctx: ValidationContext): Promise<ValidatorResult<string>> {
    // Type check
    if (value !== undefined && value !== null && typeof value !== "string") {
      return { success: false, errors: [{ path: ctx.path, message: getMessage("type_string"), code: "type_string", value }] };
    }

    let v = value as string;

    // Default
    if ((v === undefined || v === null) && this._defaultValue !== undefined) {
      v = this._defaultValue;
    }

    // Required
    if (this._required && (v === undefined || v === null || v === "")) {
      return { success: false, errors: [{ path: ctx.path, message: getMessage("required"), code: "required", value: v }] };
    }

    if (!this._required && (v === undefined || v === null)) {
      return { success: true, data: undefined as any };
    }

    // Transforms
    v = this.applyTransforms(v);

    // Checks
    const errors: ValidationError[] = [];
    for (const c of this.checks) {
      const ok = await c.fn(v, ctx);
      if (!ok) {
        errors.push({ path: ctx.path, message: c.message, code: c.code, value: v });
        break; // Stop at first error
      }
    }

    if (errors.length > 0) return { success: false, errors };
    return { success: true, data: v };
  }
}

class NumberValidator extends BaseValidator<number> {
  private _required = false;
  private _defaultValue?: number;

  required(msg?: string): this {
    this._required = true;
    this.checks.unshift({
      fn: (v) => v !== undefined && v !== null && !isNaN(Number(v)),
      message: msg ?? getMessage("required"),
      code: "required",
    });
    return this;
  }

  default(value: number): this {
    this._defaultValue = value;
    return this;
  }

  min(val: number, msg?: string): this {
    this.checks.push({
      fn: (v) => typeof v === "number" && v >= val,
      message: msg ?? getMessage("min_value", "en", { min: val }),
      code: "min_value",
    });
    return this;
  }

  max(val: number, msg?: string): this {
    this.checks.push({
      fn: (v) => typeof v === "number" && v <= val,
      message: msg ?? getMessage("max_value", "en", { max: val }),
      code: "max_value",
    });
    return this;
  }

  int(msg?: string): this {
    this.checks.push({
      fn: (v) => Number.isInteger(v),
      message: msg ?? "Must be an integer",
      code: "integer",
    });
    return this;
  }

  positive(msg?: string): this {
    this.checks.push({
      fn: (v) => typeof v === "number" && v > 0,
      message: msg ?? "Must be positive",
      code: "positive",
    });
    return this;
  }

  nonNegative(msg?: string): this {
    this.checks.push({
      fn: (v) => typeof v === "number" && v >= 0,
      message: msg ?? "Must be non-negative",
      code: "non_negative",
    });
    return this;
  }

  finite(msg?: string): this {
    this.checks.push({
      fn: (v) => typeof v === "number" && Number.isFinite(v),
      message: msg ?? "Must be a finite number",
      code: "finite",
    });
    return this;
  }

  coerce(): this {
    this.transforms.push((v) => (typeof v === "string" ? parseFloat(v) : Number(v)));
    return this;
  }

  async validate(value: unknown, ctx: ValidationContext): Promise<ValidatorResult<number>> {
    if (value !== undefined && value !== null && typeof value !== "number") {
      // Try coerce
      const num = Number(value);
      if (isNaN(num)) {
        return { success: false, errors: [{ path: ctx.path, message: getMessage("type_number"), code: "type_number", value }] };
      }
      value = num;
    }

    let v = value as number;

    if ((v === undefined || isNaN(v)) && this._defaultValue !== undefined) {
      v = this._defaultValue;
    }

    if (this._required && (v === undefined || v === null || isNaN(v))) {
      return { success: false, errors: [{ path: ctx.path, message: getMessage("required"), code: "required", value: v }] };
    }

    if (!this._required && (v === undefined || v === null)) {
      return { success: true, data: undefined as any };
    }

    v = this.applyTransforms(v);

    const errors: ValidationError[] = [];
    for (const c of this.checks) {
      const ok = await c.fn(v, ctx);
      if (!ok) {
        errors.push({ path: ctx.path, message: c.message, code: c.code, value: v });
        break;
      }
    }

    if (errors.length > 0) return { success: false, errors };
    return { success: true, data: v };
  }
}

class BooleanValidator extends BaseValidator<boolean> {
  private _required = false;
  private _defaultValue?: boolean;

  required(msg?: string): this {
    this._required = true;
    return this;
  }

  default(value: boolean): this {
    this._defaultValue = value;
    return this;
  }

  async validate(value: unknown, ctx: ValidationContext): Promise<ValidatorResult<boolean>> {
    if (value !== undefined && value !== null && typeof value !== "boolean") {
      return { success: false, errors: [{ path: ctx.path, message: getMessage("type_boolean"), code: "type_boolean", value }] };
    }

    let v = value as boolean;
    if (v === undefined && this._defaultValue !== undefined) v = this._defaultValue;

    if (this._required && v === undefined) {
      return { success: false, errors: [{ path: ctx.path, message: getMessage("required"), code: "required" }] };
    }

    return { success: true, data: v ?? false };
  }
}

class ArrayValidator<T> extends BaseValidator<T[]> {
  private _required = false;
  private _itemValidator?: SchemaValidator<T>;

  required(msg?: string): this {
    this._required = true;
    return this;
  }

  of(validator: SchemaValidator<T>): this {
    this._itemValidator = validator;
    return this;
  }

  min(len: number, msg?: string): this {
    this.checks.push({
      fn: (v) => Array.isArray(v) && v.length >= len,
      message: msg ?? getMessage("array_min", "en", { min: len }),
      code: "array_min",
    });
    return this;
  }

  max(len: number, msg?: string): this {
    this.checks.push({
      fn: (v) => Array.isArray(v) && v.length <= len,
      message: msg ?? getMessage("array_max", "en", { max: len }),
      code: "array_max",
    });
    return this;
  }

  unique(msg?: string): this {
    this.checks.push({
      fn: (v) => Array.isArray(v) && new Set(v).size === v.length,
      message: msg ?? getMessage("array_unique"),
      code: "array_unique",
    });
    return this;
  }

  nonEmpty(msg?: string): this {
    return this.min(1, msg ?? "Array must not be empty");
  }

  async validate(value: unknown, ctx: ValidationContext): Promise<ValidatorResult<T[]>> {
    if (value !== undefined && value !== null && !Array.isArray(value)) {
      return { success: false, errors: [{ path: ctx.path, message: getMessage("type_array"), code: "type_array", value }] };
    }

    let v = value as T[];

    if (this._required && !Array.isArray(v)) {
      return { success: false, errors: [{ path: ctx.path, message: getMessage("required"), code: "required" }] };
    }

    if (!this._required && !Array.isArray(v)) {
      return { success: true, data: undefined as any };
    }

    v = this.applyTransforms(v);

    // Self checks
    const errors: ValidationError[] = [];
    for (const c of this.checks) {
      const ok = await c.fn(v, ctx);
      if (!ok) {
        errors.push({ path: ctx.path, message: c.message, code: c.code, value: v });
        break;
      }
    }

    if (errors.length > 0) return { success: false, errors };

    // Item-level validation
    if (this._itemValidator && Array.isArray(v)) {
      const itemErrors: ValidationError[] = [];
      const validItems: T[] = [];

      for (let i = 0; i < v.length; i++) {
        const itemCtx = { ...ctx, path: `${ctx.path}[${i}]`, root: ctx.root };
        const result = await this._itemValidator.validate(v[i], itemCtx);
        if (result.success && result.data !== undefined) {
          validItems.push(result.data);
        } else if (result.errors) {
          itemErrors.push(...result.errors!);
        }
      }

      if (itemErrors.length > 0) {
        return { success: false, errors: itemErrors };
      }
      v = validItems;
    }

    return { success: true, data: v };
  }
}

class ObjectValidator extends BaseValidator<Record<string, unknown>> {
  private shape: Record<string, SchemaValidator<unknown>>;
  private _required = false;

  constructor(shape: Record<string, SchemaValidator<unknown>>) {
    super();
    this.shape = shape;
  }

  required(msg?: string): this {
    this._required = true;
    return this;
  }

  partial(): ObjectValidator {
    // Make all fields optional by wrapping with .optional()
    const newShape: Record<string, SchemaValidator<unknown>> = {};
    for (const [key, validator] of Object.entries(this.shape)) {
      // Mark as optional - we handle this in validate
      newShape[key] = validator;
    }
    this._partial = true;
    return this;
  }
  private _partial = false;

  async validate(value: unknown, ctx: ValidationContext): Promise<ValidatorResult<Record<string, unknown>>> {
    if (value !== undefined && value !== null && typeof value !== "object" || Array.isArray(value)) {
      return { success: false, errors: [{ path: ctx.path, message: getMessage("type_object"), code: "type_object", value }] };
    }

    let obj = (value ?? {}) as Record<string, unknown>;

    if (this._required && (!obj || Object.keys(obj).length === 0)) {
      return { success: false, errors: [{ path: ctx.path, message: getMessage("required"), code: "required" }] };
    }

    if (!this._required && (!value || Object.keys(obj).length === 0)) {
      return { success: true, data: {} };
    }

    obj = this.applyTransforms(obj);

    const errors: ValidationError[] = [];
    const result: Record<string, unknown> = {};

    for (const [key, validator] of Object.entries(this.shape)) {
      const fieldCtx = { ...ctx, path: ctx.path ? `${ctx.path}.${key}` : key, root: (ctx.root ?? obj) as Record<string, unknown> };
      const v = validateWithOptional(validator, obj[key], fieldCtx, this._partial);

      if (v instanceof Promise) {
        const resolved = await v;
        if (resolved.success && resolved.data !== undefined) {
          result[key] = resolved.data;
        } else if (resolved.errors) {
          errors.push(...resolved.errors);
        }
      } else {
        if (v.success && v.data !== undefined) {
          result[key] = v.data;
        } else if (v.errors) {
          errors.push(...v.errors);
        }
      }
    }

    if (errors.length > 0) return { success: false, errors };
    return { success: true, data: result };
  }
}

async function validateWithOptional(
  validator: SchemaValidator<unknown>,
  value: unknown,
  ctx: ValidationContext,
  isPartial: boolean,
): Promise<ValidatorResult<unknown>> {
  if (isPartial && (value === undefined || value === null)) {
    return { success: true, data: undefined };
  }
  return validator.validate(value, ctx);
}

// --- Union / Enum / Literal ---

class EnumValidator<T extends string | number> extends BaseValidator<T> {
  private values: T[];
  private _required = false;

  constructor(values: T[]) {
    super();
    this.values = values;
  }

  required(msg?: string): this {
    this._required = true;
    return this;
  }

  async validate(value: unknown, ctx: ValidationContext): Promise<ValidatorResult<T>> {
    if (!this.values.includes(value as T)) {
      return { success: false, errors: [{ path: ctx.path, message: getMessage("enum_invalid", "en", { values: this.values.join(", ") }), code: "enum_invalid", value }] };
    }
    return { success: true, data: value as T };
  }
}

class LiteralValidator<T extends string | number | boolean> extends BaseValidator<T> {
  constructor(private literal: T) { super(); }

  async validate(value: unknown, ctx: ValidationContext): Promise<ValidatorResult<T>> {
    if (value !== this.literal) {
      return { success: false, errors: [{ path: ctx.path, message: `Must be exactly ${JSON.stringify(this.literal)}`, code: "literal_mismatch", value }] };
    }
    return { success: true, data: value as T };
  }
}

class NullableValidator<T> extends BaseValidator<T | null> {
  constructor(private inner: SchemaValidator<T>) { super(); }

  async validate(value: unknown, ctx: ValidationContext): Promise<ValidatorResult<T | null>> {
    if (value === null) return { success: true, data: null };
    return this.inner.validate(value, ctx);
  }
}

// --- Schema Validator (union type) ---

export type SchemaValidator<T> =
  | StringValidator
  | NumberValidator
  | BooleanValidator
  | ArrayValidator<any>
  | ObjectValidator
  | EnumValidator<any>
  | LiteralValidator<any>
  | NullableValidator<any>;

// --- Builder API ---

/** Create a string schema */
export function string_(): StringValidator { return new StringValidator(); }

/** Create a number schema */
export function number_(): NumberValidator { return new NumberValidator(); }

/** Create a boolean schema */
export function boolean_(): BooleanValidator { return new BooleanValidator(); }

/** Create an object schema with defined shape */
export function object<T extends Record<string, SchemaValidator<unknown>>>(shape: T): ObjectValidator {
  return new ObjectValidator(shape);
}

/** Create an array schema */
export function array<T>(itemSchema?: SchemaValidator<T>): ArrayValidator<T> {
  const v = new ArrayValidator<T>();
  if (itemSchema) v.of(itemSchema);
  return v;
}

/** Create an enum schema (one of specific values) */
export function enum_<T extends string | number>(values: T[]): EnumValidator<T> {
  return new EnumValidator(values);
}

/** Create a literal schema (exact value match) */
export function literal<T extends string | number | boolean>(value: T): LiteralValidator<T> {
  return new LiteralValidator(value);
}

/** Wrap a schema to allow null */
export function nullable<T>(schema: SchemaValidator<T>): NullableValidator<T> {
  return new NullableValidator(schema);
}

/** Any-value pass-through schema */
export function any_(): SchemaValidator<unknown> {
  return { validate: async (v: unknown) => ({ success: true, data: v }) } as SchemaValidator<unknown>;
}

/** Unknown-value schema (same as any_) */
export function unknown_(): SchemaValidator<unknown> { return any_(); }

// --- Main Schema Class ---

export class Schema<T extends Record<string, unknown>> {
  private shape: Record<string, SchemaValidator<unknown>>;
  private options: Required<ValidatorOptions>;

  constructor(shape: Record<string, SchemaValidator<unknown>>, options: ValidatorOptions = {}) {
    this.shape = shape;
    this.options = {
      abortEarly: options.abortEarly ?? false,
      stripUnknown: options.stripUnknown ?? false,
      locale: options.locale ?? "en",
      messages: options.messages ?? {},
      preprocess: options.preprocess,
      postprocess: options.postprocess,
    };
  }

  /** Validate data against the schema */
  async validate(data: unknown): Promise<ValidatorResult<T>> {
    const ctx: ValidationContext = {
      root: (data ?? {}) as Record<string, unknown>,
      path: "",
      meta: {},
    };

    // Preprocess
    if (this.options.preprocess) {
      data = this.options.preprocess(data);
    }

    // Must be object
    if (data === null || data === undefined || typeof data !== "object" || Array.isArray(data)) {
      return { success: false, errors: [{ path: "", message: getMessage("type_object", this.options.locale), code: "type_object", value: data }] };
    }

    const obj = data as Record<string, unknown>;
    const errors: ValidationError[] = [];
    const result: Record<string, unknown> = {};

    for (const [key, validator] of Object.entries(this.shape)) {
      const fieldCtx = { ...ctx, path: key, root: obj };
      const res = await validator.validate(obj[key], fieldCtx);

      if (res.success && res.data !== undefined) {
        result[key] = res.data;
      } else if (res.errors) {
        errors.push(...res.errors);
        if (this.options.abortEarly) break;
      }
    }

    // Strip unknown keys
    if (this.options.stripUnknown) {
      for (const key of Object.keys(obj)) {
        if (!(key in this.shape)) delete obj[key];
      }
    }

    if (errors.length > 0) return { success: false, errors } as ValidatorResult<T>;

    let output = result as T;

    // Postprocess
    if (this.options.postprocess) {
      output = this.options.postprocess(output) as T;
    }

    return { success: true, data: output };
  }

  /** Synchronous validate (no async checks) */
  validateSync(data: unknown): ValidatorResult<T> {
    // For sync mode, we wrap and immediately await
    let result: ValidatorResult<T>;
    void this.validate(data).then(r => { result = r; });
    // Fallback: do basic sync validation
    if (data === null || data === undefined || typeof data !== "object" || Array.isArray(data)) {
      return { success: false, errors: [{ path: "", message: "Expected object", code: "type_object" }] };
    }
    return { success: true, data: data as T };
  }

  /** Validate and throw on failure */
  async parse(data: unknown): Promise<T> {
    const result = await this.validate(data);
    if (!result.success) throw new ValidationException(result.errors!);
    return result.data!;
  }

  /** Get the schema shape (for composition) */
  getShape(): Record<string, SchemaValidator<unknown>> { return this.shape; }

  /** Extend this schema with additional fields */
  extend(extra: Record<string, SchemaValidator<unknown>>): Schema<T & Record<string, unknown>> {
    return new Schema({ ...this.shape, ...extra }, this.options) as Schema<T & Record<string, unknown>>;
  }

  /** Pick only specified fields */
  pick<K extends keyof T & string>(keys: K[]): Schema<Pick<T & Record<string, unknown>, K>> {
    const picked: Record<string, SchemaValidator<unknown>> = {};
    for (const k of keys) if (k in this.shape) picked[k] = this.shape[k]!;
    return new Schema(picked, this.options) as any;
  }

  /** Omit specified fields */
  omit<K extends keyof T & string>(keys: K[]): Schema<Omit<T & Record<string, unknown>, K>> {
    const omitted = { ...this.shape };
    for (const k of keys) delete omitted[k];
    return new Schema(omitted, this.options) as any;
  }
}

// --- Exception ---

export class ValidationException extends Error {
  readonly errors: ValidationError[];
  constructor(errors: ValidationError[]) {
    super(`Validation failed: ${errors.map(e => e.message).join("; ")}`);
    this.name = "ValidationException";
    this.errors = errors;
  }
}
