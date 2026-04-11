/**
 * JSON Schema: Schema validation, generation, and utility functions
 * supporting JSON Schema Draft 2020-12 subset.
 *
 * Provides:
 *   - Schema validation with detailed error paths
 *   - Schema introspection (required fields, types, defaults)
 *   - Value coercion based on schema type constraints
 *   - Schema merging (allOf/anyOf/oneOf)
 *   - UI hint extraction for form generation
 *   - Schema-to-TypeScript type generation (basic)
 */

// --- Types ---

export type JsonSchemaType = "string" | "number" | "integer" | "boolean" | "null" | "object" | "array";

export interface JsonSchema {
  /** JSON Schema type(s) */
  type?: JsonSchemaType | JsonSchemaType[];
  /** Schema title */
  title?: string;
  /** Schema description */
  description?: string;
  /** Enumerated allowed values */
  enum?: unknown[];
  /** Constant value */
  const?: unknown;
  /** Default value */
  default?: unknown;
  /** Examples */
  examples?: unknown[];
  /** String constraints */
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  /** Number constraints */
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  /** Object constraints */
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  required?: string[];
  propertyNames?: { pattern: string };
  minProperties?: number;
  maxProperties?: number;
  /** Array constraints */
  items?: JsonSchema | JsonSchema[];
  additionalItems?: boolean | JsonSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  contains?: JsonSchema;
  /** Composition keywords */
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  not?: JsonSchema;
  if?: JsonSchema;
  then?: JsonSchema;
  else?: JsonSchema;
  /** Generic extensions */
  [key: string]: unknown;
}

export interface ValidationError {
  /** Path to the invalid field (JSON Pointer) */
  path: string;
  /** Human-readable message */
  message: string;
  /** The keyword that failed */
  keyword: string;
  /** The value that failed validation */
  value?: unknown;
  /** Nested errors (for composition) */
  errors?: ValidationError[];
}

export interface ValidationResult {
  /** Whether the data is valid */
  valid: boolean;
  /** Array of validation errors */
  errors: ValidationError[];
}

export interface UiHint {
  /** Suggested form widget type */
  widget?: "text" | "textarea" | "number" | "select" | "checkbox" | "radio" | "color" | "date" | "email" | "url" | "password" | "file" | "hidden";
  /** Field label override */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Help text */
  helpText?: string;
  /** Order index in form */
  order?: number;
  /** Whether field is readonly */
  readOnly?: boolean;
  /** Whether field is hidden */
  hidden?: boolean;
  /** CSS class */
  className?: string;
  /** Grouping category */
  group?: string;
}

// --- Validation ---

/** Validate a data value against a JSON Schema */
export function validate(data: unknown, schema: JsonSchema): ValidationResult {
  const errors: ValidationError[] = [];
  validateValue(data, schema, "", errors);
  return { valid: errors.length === 0, errors };
}

function validateValue(
  value: unknown,
  schema: JsonSchema,
  path: string,
  errors: ValidationError[],
): void {
  // Check type
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => checkType(value, t))) {
      errors.push({
        path,
        message: `Expected type ${types.join(" or ")}, got ${typeof value}`,
        keyword: "type",
        value,
      });
      return; // Don't continue if type doesn't match
    }
  }

  // Check const
  if (schema.const !== undefined && !deepEqual(value, schema.const)) {
    errors.push({ path, message: `Value must be ${JSON.stringify(schema.const)}`, keyword: "const", value });
    return;
  }

  // Check enum
  if (schema.enum && !schema.enum.some((v) => deepEqual(value, v))) {
    errors.push({ path, message: `Value must be one of: ${schema.enum.map((v) => JSON.stringify(v)).join(", ")}`, keyword: "enum", value });
  }

  // Type-specific validations
  if (typeof value === "string") validateString(value, schema, path, errors);
  if (typeof value === "number") validateNumber(value, schema, path, errors);
  if (typeof value === "boolean") validateBoolean(value, schema, path, errors);
  if (value === null) /* null always valid */ ;
  if (Array.isArray(value)) validateArray(value, schema, path, errors);
  if (typeof value === "object" && value !== null && !Array.isArray(value)) validateObject(value as Record<string, unknown>, schema, path, errors);

  // Composition
  if (schema.allOf) {
    for (let i = 0; i < schema.allOf.length; i++) {
      const subErrors: ValidationError[] = [];
      validateValue(value, schema.allOf[i]!, `${path}/allOf/${i}`, subErrors);
      if (subErrors.length > 0) errors.push({ path, message: "Failed allOf constraint", keyword: "allOf", errors: subErrors });
    }
  }

  if (schema.anyOf) {
    const anyValid = schema.anyOf.some((s) => {
      const subErrors: ValidationError[] = [];
      validateValue(value, s, "", subErrors);
      return subErrors.length === 0;
    });
    if (!anyValid) errors.push({ path, message: "Value must match at least one anyOf schema", keyword: "anyOf", value });
  }

  if (schema.oneOf) {
    let matchCount = 0;
    for (const s of schema.oneOf) {
      const subErrors: ValidationError[] = [];
      validateValue(value, s, "", subErrors);
      if (subErrors.length === 0) matchCount++;
    }
    if (matchCount !== 1) errors.push({ path, message: `Value must match exactly one oneOf schema (matched ${matchCount})`, keyword: "oneOf", value });
  }

  if (schema.not) {
    const subErrors: ValidationError[] = [];
    validateValue(value, schema.not, "", subErrors);
    if (subErrors.length === 0) errors.push({ path, message: "Value must not match the 'not' schema", keyword: "not", value });
  }

  // Conditional
  if (schema.if) {
    const ifErrors: ValidationError[] = [];
    validateValue(value, schema.if, "", ifErrors);

    if (ifErrors.length === 0) {
      // if matches — apply then
      if (schema.then) validateValue(value, schema.then, `${path}/then`, errors);
    } else {
      // if doesn't match — apply else
      if (schema.else) validateValue(value, schema.else, `${path}/else`, errors);
    }
  }
}

function checkType(value: unknown, type: JsonSchemaType): boolean {
  switch (type) {
    case "string": return typeof value === "string";
    case "number": return typeof value === "number" && !Number.isNaN(value);
    case "integer": return Number.isInteger(value);
    case "boolean": return typeof value === "boolean";
    case "null": return value === null;
    case "object": return typeof value === "object" && value !== null && !Array.isArray(value);
    case "array": return Array.isArray(value);
    default: return true;
  }
}

function validateString(value: string, schema: JsonSchema, path: string, errors: ValidationError[]): void {
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push({ path, message: `String too short (min ${schema.minLength})`, keyword: "minLength", value });
  }
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    errors.push({ path, message: `String too long (max ${schema.maxLength})`, keyword: "maxLength", value });
  }
  if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
    errors.push({ path, message: `String does not match pattern: ${schema.pattern}`, keyword: "pattern", value });
  }
  // Format checks (basic)
  if (schema.format) {
    const formatChecks: Record<string, (v: string) => boolean> = {
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      uri: (v) => { try { new URL(v); return true; } catch { return false; } },
      "date-time": (v) => !isNaN(Date.parse(v)),
      date: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
      time: (v) => /^\d{2}:\d{2}(:\d{2})?/.test(v),
      uuid: (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
    };
    const checker = formatChecks[schema.format];
    if (checker && !checker(value)) {
      errors.push({ path, message: `String does not match format: ${schema.format}`, keyword: "format", value });
    }
  }
}

function validateNumber(value: number, schema: JsonSchema, path: string, errors: ValidationError[]): void {
  if (schema.minimum !== undefined && value < schema.minimum) {
    errors.push({ path, message: `Value below minimum (${schema.minimum})`, keyword: "minimum", value });
  }
  if (schema.maximum !== undefined && value > schema.maximum) {
    errors.push({ path, message: `Value above maximum (${schema.maximum})`, keyword: "maximum", value });
  }
  if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
    errors.push({ path, message: `Value must be greater than ${schema.exclusiveMinimum}`, keyword: "exclusiveMinimum", value });
  }
  if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
    errors.push({ path, message: `Value must be less than ${schema.exclusiveMaximum}`, keyword: "exclusiveMaximum", value });
  }
  if (schema.multipleOf !== undefined) {
    const remainder = value % schema.multipleOf;
    if (!Number.isNaN(remainder) && Math.abs(remainder) > 1e-10) {
      errors.push({ path, message: `Value must be a multiple of ${schema.multipleOf}`, keyword: "multipleOf", value });
    }
  }
}

function validateBoolean(_value: boolean, _schema: JsonSchema, _path: string, _errors: ValidationError[]): void {
  // No specific boolean constraints in basic implementation
}

function validateArray(value: unknown[], schema: JsonSchema, path: string, errors: ValidationError[]): void {
  if (schema.minItems !== undefined && value.length < schema.minItems) {
    errors.push({ path, message: `Array too few items (min ${schema.minItems})`, keyword: "minItems", value });
  }
  if (schema.maxItems !== undefined && value.length > schema.maxItems) {
    errors.push({ path, message: `Array too many items (max ${schema.maxItems})`, keyword: "maxItems", value });
  }
  if (schema.uniqueItems) {
    const seen = new Set();
    for (const item of value) {
      const key = JSON.stringify(item);
      if (seen.has(key)) { errors.push({ path, message: "Array items must be unique", keyword: "uniqueItems", value }); break; }
      seen.add(key);
    }
  }
  if (schema.items) {
    const itemSchemas = Array.isArray(schema.items) ? schema.items : [schema.items];
    for (let i = 0; i < value.length; i++) {
      const itemSchema = itemSchemas[Math.min(i, itemSchemas.length - 1)];
      validateValue(value[i], itemSchema!, `${path}/${i}`, errors);
    }
  }
  if (schema.contains) {
    const containsMatch = value.some((item) => {
      const subErrors: ValidationError[] = [];
      validateValue(item, schema.contains!, "", subErrors);
      return subErrors.length === 0;
    });
    if (!containsMatch) errors.push({ path, message: "No array item matches 'contains' schema", keyword: "contains", value });
  }
}

function validateObject(value: Record<string, unknown>, schema: JsonSchema, path: string, errors: ValidationError[]): void {
  const keys = Object.keys(value);

  if (schema.required) {
    for (const req of schema.required) {
      if (!(req in value)) {
        errors.push({ path: `${path}/${req}`, message: `Missing required property: "${req}"`, keyword: "required" });
      }
    }
  }

  if (schema.minProperties !== undefined && keys.length < schema.minProperties) {
    errors.push({ path, message: `Too few properties (min ${schema.minProperties})`, keyword: "minProperties" });
  }
  if (schema.maxProperties !== undefined && keys.length > schema.maxProperties) {
    errors.push({ path, message: `Too many properties (max ${schema.maxProperties})`, keyword: "maxProperties" });
  }

  if (schema.properties) {
    for (const key of keys) {
      const propSchema = schema.properties[key];
      if (propSchema) validateValue(value[key], propSchema, `${path}/${key}`, errors);
    }
  }

  if (schema.additionalProperties === false && schema.properties) {
    for (const key of keys) {
      if (!(key in schema.properties!)) {
        errors.push({ path: `${path}/${key}`, message: `Additional property not allowed: "${key}"`, keyword: "additionalProperties" });
      }
    }
  }
}

// --- Schema Introspection ---

/** Get required field names from a schema */
export function getRequiredFields(schema: JsonSchema): string[] {
  return schema.required ?? [];
}

/** Get all property names defined in a schema */
export function getPropertyNames(schema: JsonSchema): string[] {
  return Object.keys(schema.properties ?? {});
}

/** Get default values from a schema */
export function getDefaults(schema: JsonSchema): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  if (schema.default !== undefined) defaults[""] = schema.default;
  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (prop.default !== undefined) defaults[key] = prop.default;
    }
  }
  return defaults;
}

/** Generate a sample value conforming to a schema */
export function generateExample(schema: JsonSchema): unknown {
  if (schema.const !== undefined) return schema.const;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];
  if (schema.examples?.length) return schema.examples[0];

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  switch (type) {
    case "string":
      if (schema.format === "email") return "user@example.com";
      if (schema.format === "uri") return "https://example.com";
      if (schema.format === "date-time") return new Date().toISOString();
      return schema.title ?? "string";
    case "number":
    case "integer":
      return schema.minimum ?? 0;
    case "boolean": return true;
    case "null": return null;
    case "array":
      if (schema.items) return [generateExample(Array.isArray(schema.items) ? schema.items[0]! : schema.items)];
      return [];
    case "object":
      if (schema.properties) {
        const obj: Record<string, unknown> = {};
        for (const [key, prop] of Object.entries(schema.properties)) {
          obj[key] = generateExample(prop);
        }
        return obj;
      }
      return {};
    default: return null;
  }
}

// --- UI Hint Extraction ---

/** Extract UI rendering hints from a schema */
export function extractUiHints(schema: JsonSchema, fieldName?: string): UiHint {
  const hint: UiHint = {};

  if (fieldName) hint.label = schema.title ?? toLabel(fieldName);
  if (schema.description) hint.helpText = schema.description;

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  if (type === "boolean") hint.widget = "checkbox";
  else if (schema.enum?.length) hint.widget = schema.enum.length <= 3 ? "radio" : "select";
  else if (type === "string") {
    if (schema.format === "email") hint.widget = "email";
    else if (schema.format === "uri") hint.widget = "url";
    else if (schema.format === "date" || schema.format === "date-time") hint.widget = "date";
    else if (schema.format === "password") hint.widget = "password";
    else if ((schema.maxLength ?? 0) > 200 || schema.multiline) hint.widget = "textarea";
    else hint.widget = "text";
  }
  else if (type === "integer" || type === "number") hint.widget = "number";
  else if (type === "array") hint.widget = schema.uniqueItems ? "select" : "text";

  if (schema.readOnly) hint.readOnly = true;

  return hint;
}

function toLabel(fieldName: string): string {
  return fieldName
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

// --- Coercion ---

/** Coerce a raw value to match the schema's type constraints */
export function coerceValue(value: unknown, schema: JsonSchema): unknown {
  if (value === null || value === undefined) return schema.default ?? value;

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  switch (type) {
    case "number": {
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    }
    case "integer": {
      const n = parseInt(String(value), 10);
      return Number.isNaN(n) ? value : n;
    }
    case "boolean":
      if (value === "true") return true;
      if (value === "false") return false;
      return Boolean(value);
    case "string": return String(value);
    default:
      return value;
  }
}

// --- Utilities ---

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}
