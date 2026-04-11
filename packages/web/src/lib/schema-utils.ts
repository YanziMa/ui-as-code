/**
 * Schema Utilities: JSON Schema-like validation, schema composition,
 * schema transformation, schema diffing, schema generation from data,
 * schema-to-TypeScript conversion, and schema registry.
 */

// --- Types ---

export type SchemaType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "null"
  | "array"
  | "object"
  | "any";

export interface BaseSchema {
  type?: SchemaType;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  const?: unknown;
  examples?: unknown[];
  /** Custom metadata */
  [key: string]: unknown;
}

export interface StringSchema extends BaseSchema {
  type: "string";
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string; // email, uri, date, date-time, time, uuid, hostname, ipv4, ipv6, etc.
}

export interface NumberSchema extends BaseSchema {
  type: "number" | "integer";
  minimum?: number;
  exclusiveMinimum?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
}

export interface BooleanSchema extends BaseSchema {
  type: "boolean";
}

export interface NullSchema extends BaseSchema {
  type: "null";
}

export interface ArraySchema extends BaseSchema {
  type: "array";
  items?: JsonSchema;
  additionalItems?: boolean | JsonSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  contains?: JsonSchema;
}

export interface ObjectSchema extends BaseSchema {
  type: "object";
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  minProperties?: number;
  maxProperties?: number;
  patternProperties?: Record<string, JsonSchema>;
  propertyNames?: { pattern: string };
  dependencies?: Record<string, JsonSchema | string[]>;
}

export interface AnyOfSchema extends BaseSchema {
  anyOf: JsonSchema[];
}

export interface OneOfSchema extends BaseSchema {
  oneOf: JsonSchema[];
}

export interface AllOfSchema extends BaseSchema {
  allOf: JsonSchema[];
}

export interface NotSchema extends BaseSchema {
  not: JsonSchema;
}

export interface RefSchema extends BaseSchema {
  $ref: string;
}

export type JsonSchema =
  | StringSchema
  | NumberSchema
  | BooleanSchema
  | NullSchema
  | ArraySchema
  | ObjectSchema
  | AnyOfSchema
  | OneOfSchema
  | AllOfSchema
  | NotSchema
  | RefSchema;

export interface SchemaValidationError {
  path: string;
  message: string;
  value?: unknown;
  keyword?: string;
  /** Nested errors for objects/arrays */
  children?: SchemaValidationError[];
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
}

// --- Schema Validation Engine ---

/** Validate a value against a JSON Schema (subset of JSON Schema draft-07) */
export function validateSchema(
  value: unknown,
  schema: JsonSchema,
  options?: { rootPath?: string },
): SchemaValidationResult {
  const errors: SchemaValidationError[] = [];
  const rootPath = options?.rootPath ?? "$";

  function validateInternal(v: unknown, s: JsonSchema, path: string): void {
    // Handle $ref
    if ("$ref" in s && s.$ref) {
      // In a full implementation we'd resolve refs. For now skip ref resolution.
      return;
    }

    // Handle composite schemas
    if ("allOf" in s && s.allOf) {
      for (const sub of s.allOf) validateInternal(v, sub, path);
      return;
    }

    if ("anyOf" in s && s.anyOf) {
      const subErrors: SchemaValidationError[][] = [];
      let anyValid = false;
      for (const sub of s.anyOf) {
        const result = collectErrors(v, sub, path);
        if (result.valid) { anyValid = true; break; }
        subErrors.push(result.errors);
      }
      if (!anyValid) {
        errors.push({ path, message: `Value does not match any of the allowed schemas`, keyword: "anyOf", children: subErrors.flat() });
      }
      return;
    }

    if ("oneOf" in s && s.oneOf) {
      let matchCount = 0;
      for (const sub of s.oneOf) {
        const result = collectErrors(v, sub, path);
        if (result.valid) matchCount++;
      }
      if (matchCount !== 1) {
        errors.push({ path, message: `Value must match exactly one schema, matched ${matchCount}`, keyword: "oneOf" });
      }
      return;
    }

    if ("not" in s && s.not) {
      const result = collectErrors(v, s.not, path);
      if (result.valid) {
        errors.push({ path, message: `Value must not match the schema`, keyword: "not", value: v });
      }
      return;
    }

    // Type check
    if (s.type) {
      const types = Array.isArray(s.type) ? s.type : [s.type];
      if (!types.some((t) => checkType(v, t))) {
        errors.push({
          path,
          message: `Expected type ${types.join(" or ")}, got ${typeof v}`,
          keyword: "type",
          value: v,
        });
        return; // Don't continue validating if type is wrong
      }
    }

    // Enum check
    if (s.enum && !s.enum.includes(v)) {
      errors.push({
        path,
        message: `Value must be one of: ${s.enum.map(String).join(", ")}`,
        keyword: "enum",
        value: v,
      });
    }

    // Const check
    if ("const" in s && s.const !== undefined && v !== s.const) {
      errors.push({
        path,
        message: `Value must be constant ${JSON.stringify(s.const)}`,
        keyword: "const",
        value: v,
      });
    }

    // String validations
    if (typeof v === "string") {
      if ("minLength" in s && s.minLength !== undefined && v.length < s.minLength) {
        errors.push({ path, message: `String too short (${v.length} < ${s.minLength})`, keyword: "minLength" });
      }
      if ("maxLength" in s && s.maxLength !== undefined && v.length > s.maxLength) {
        errors.push({ path, message: `String too long (${v.length} > ${s.maxLength})`, keyword: "maxLength" });
      }
      if ("pattern" in s && s.pattern && !new RegExp(s.pattern).test(v)) {
        errors.push({ path, message: `String does not match pattern: ${s.pattern}`, keyword: "pattern" });
      }
      if ("format" in s && s.format) {
        const formatErr = checkFormat(v, s.format);
        if (formatErr) errors.push({ path, message: formatErr, keyword: "format" });
      }
    }

    // Number validations
    if (typeof v === "number") {
      if ("minimum" in s && s.minimum !== undefined && v < s.minimum) {
        errors.push({ path, message: `Value ${v} is less than minimum ${s.minimum}`, keyword: "minimum" });
      }
      if ("exclusiveMinimum" in s && s.exclusiveMinimum !== undefined && v <= s.exclusiveMinimum) {
        errors.push({ path, message: `Value ${v} must be greater than ${s.exclusiveMinimum}`, keyword: "exclusiveMinimum" });
      }
      if ("maximum" in s && s.maximum !== undefined && v > s.maximum) {
        errors.push({ path, message: `Value ${v} exceeds maximum ${s.maximum}`, keyword: "maximum" });
      }
      if ("exclusiveMaximum" in s && s.exclusiveMaximum !== undefined && v >= s.exclusiveMaximum) {
        errors.push({ path, message: `Value ${v} must be less than ${s.exclusiveMaximum}`, keyword: "exclusiveMaximum" });
      }
      if ("multipleOf" in s && s.multipleOf !== undefined) {
        const remainder = v % s.multipleOf;
        if (remainder !== 0 && Math.abs(remainder - s.multipleOf) > 1e-10) {
          errors.push({ path, message: `Value ${v} is not a multiple of ${s.multipleOf}`, keyword: "multipleOf" });
        }
      }
    }

    // Array validations
    if (Array.isArray(v)) {
      if ("minItems" in s && s.minItems !== undefined && v.length < s.minItems) {
        errors.push({ path, message: `Array too short (${v.length} items, min ${s.minItems})`, keyword: "minItems" });
      }
      if ("maxItems" in s && s.maxItems !== undefined && v.length > s.maxItems) {
        errors.push({ path, message: `Array too long (${v.length} items, max ${s.maxItems})`, keyword: "maxItems" });
      }
      if ("uniqueItems" in s && s.uniqueItems) {
        const strItems = v.map((item) => JSON.stringify(item));
        if (strItems.length !== new Set(strItems).size) {
          errors.push({ path, message: "Array items must be unique", keyword: "uniqueItems" });
        }
      }
      if ("contains" in s && s.contains) {
        if (!v.some((item) => collectErrors(item, s.contains!, `${path}[?]`).valid)) {
          errors.push({ path, message: "No item matches the 'contains' schema", keyword: "contains" });
        }
      }
      if ("items" in s && s.items) {
        v.forEach((item, i) => {
          validateInternal(item, s.items!, `${path}[${i}]`);
        });
      }
    }

    // Object validations
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      const obj = v as Record<string, unknown>;

      if ("minProperties" in s && s.minProperties !== undefined && Object.keys(obj).length < s.minProperties) {
        errors.push({ path, message: `Object has too few properties`, keyword: "minProperties" });
      }
      if ("maxProperties" in s && s.maxProperties !== undefined && Object.keys(obj).length > s.maxProperties) {
        errors.push({ path, message: `Object has too many properties`, keyword: "maxProperties" });
      }

      // Required fields
      if ("required" in s && s.required) {
        for (const req of s.required) {
          if (!(req in obj)) {
            errors.push({ path, message: `Missing required property "${req}"`, keyword: "required" });
          }
        }
      }

      // Property validation
      if ("properties" in s && s.properties) {
        for (const [propName, propSchema] of Object.entries(s.properties)) {
          if (propName in obj) {
            validateInternal(obj[propName], propSchema, `${path}.${propName}`);
          }
        }
      }

      // Additional properties check
      if ("additionalProperties" in s && s.additionalProperties === false) {
        const allowedProps = new Set(Object.keys(s.properties ?? {}));
        for (const key of Object.keys(obj)) {
          if (!allowedProps.has(key)) {
            errors.push({ path, message: `Additional property "${key}" is not allowed`, keyword: "additionalProperties" });
          }
        }
      } else if (
        "additionalProperties" in s &&
        typeof s.additionalProperties === "object" &&
        s.additionalProperties !== null
      ) {
        const allowedProps = new Set(Object.keys(s.properties ?? {}));
        for (const [key, val] of Object.entries(obj)) {
          if (!allowedProps.has(key)) {
            validateInternal(val, s.additionalProperties as JsonSchema, `${path}.${key}`);
          }
        }
      }

      // Pattern properties
      if ("patternProperties" in s && s.patternProperties) {
        for (const [pattern, patSchema] of Object.entries(s.patternProperties)) {
          const regex = new RegExp(pattern);
          for (const [key, val] of Object.entries(obj)) {
            if (regex.test(key)) {
              validateInternal(val, patSchema, `${path}.${key}`);
            }
          }
        }
      }
    }
  }

  function collectErrors(v: unknown, s: JsonSchema, path: string): SchemaValidationResult {
    const savedLen = errors.length;
    validateInternal(v, s, path);
    const newErrors = errors.slice(savedLen);
    errors.length = savedLen;
    return { valid: newErrors.length === 0, errors: newErrors };
  }

  validateInternal(value, schema, rootPath);

  return { valid: errors.length === 0, errors };
}

function checkType(value: unknown, type: SchemaType): boolean {
  switch (type) {
    case "string": return typeof value === "string";
    case "number": return typeof value === "number" && !Number.isNaN(value);
    case "integer": return Number.isInteger(value);
    case "boolean": return typeof value === "boolean";
    case "null": return value === null;
    case "array": return Array.isArray(value);
    case "object": return typeof value === "object" && value !== null && !Array.isArray(value);
    case "any": return true;
    default: return false;
  }
}

function checkFormat(value: string, format: string): string | null {
  switch (format) {
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : "Invalid email format";
    case "uri":
    case "url":
      try { new URL(value); return null; } catch { return "Invalid URL"; }
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value))
        ? null : "Invalid date format (YYYY-MM-DD)";
    case "date-time":
      return !isNaN(Date.parse(value)) ? null : "Invalid datetime format";
    case "time":
      return /^\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/.test(value)
        ? null : "Invalid time format";
    case "uuid":
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
        ? null : "Invalid UUID format";
    case "hostname":
      return /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z]{2,}$/.test(value)
        ? null : "Invalid hostname";
    case "ipv4":
      return /^(\d{1,3}\.){3}\d{1,3}$/.test(value)
        ? null : "Invalid IPv4 address";
    case "ipv6":
      return /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(value) || value === "::"
        ? null : "Invalid IPv6 address";
    default:
      return null; // Unknown formats are ignored per spec
  }
}

// --- Schema Generation from Data ---

/** Infer a JSON Schema from a sample data value */
export function inferSchema(data: unknown, options?: { depth?: number }): JsonSchema {
  const maxDepth = options?.depth ?? 5;

  function infer(v: unknown, depth: number): JsonSchema {
    if (depth <= 0 || v === undefined) return { type: "any" };

    if (v === null) return { type: "null" };

    if (typeof v === "boolean") return { type: "boolean" };

    if (typeof v === "number") {
      return Number.isInteger(v)
        ? { type: "integer" }
        : { type: "number" };
    }

    if (typeof v === "string") {
      const schema: StringSchema = { type: "string" };
      // Try to detect format
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) schema.format = "email";
      else if (/^\d{4}-\d{2}-\d{2}/.test(v)) schema.format = "date";
      else if (/^https?:\/\//.test(v)) schema.format = "uri";
      return schema;
    }

    if (Array.isArray(v)) {
      if (v.length === 0) return { type: "array" };
      const itemSchemas = v.map((item) => infer(item, depth - 1));
      // Merge item schemas
      const merged = mergeSchemas(itemSchemas);
      return {
        type: "array",
        items: merged,
      } as ArraySchema;
    }

    if (typeof v === "object" && v !== null) {
      const props: Record<string, JsonSchema> = {};
      const required: string[] = [];

      for (const [key, val] of Object.entries(v)) {
        props[key] = infer(val, depth - 1);
        if (val !== undefined && val !== null) required.push(key);
      }

      return {
        type: "object",
        properties: props,
        required,
      } as ObjectSchema;
    }

    return { type: "any" };
  }

  return infer(data, maxDepth);
}

/** Infer a merged schema from an array of samples (union-friendly) */
export function inferSchemaFromSamples(samples: unknown[]): JsonSchema {
  if (samples.length === 0) return { type: "any" };
  if (samples.length === 1) return inferSchema(samples[0]!);

  const schemas = samples.map((s) => inferSchema(s));

  // If all same type, try to merge
  const firstType = getType(schemas[0]!);
  if (schemas.every((s) => getType(s) === firstType)) {
    return mergeSchemas(schemas);
  }

  // Otherwise use anyOf
  return { anyOf: schemas } as AnyOfSchema;
}

/** Get the primary type of a schema */
function getType(schema: JsonSchema): SchemaType | null {
  if ("type" in schema && schema.type) return schema.type;
  if ("$ref" in schema) return "any";
  if ("anyOf" in schema) return "any";
  if ("oneOf" in schema) return "any";
  if ("allOf" in schema) return "any";
  return null;
}

/** Merge multiple schemas into a single combined schema */
export function mergeSchemas(schemas: JsonSchema[]): JsonSchema {
  if (schemas.length === 0) return { type: "any" };
  if (schemas.length === 1) return schemas[0]!;

  const first = schemas[0]!;
  const rest = schemas.slice(1);

  // Simple merge for same-type object schemas
  if (first.type === "object" && rest.every((s) => s.type === "object")) {
    const mergedProps: Record<string, JsonSchema> = {};
    const allRequired = new Set<string>();

    for (const schema of schemas) {
      const objSchema = schema as ObjectSchema;
      if (objSchema.properties) {
        for (const [key, propSchema] of Object.entries(objSchema.properties)) {
          if (key in mergedProps) {
            mergedProps[key] = mergeSchemas([mergedProps[key]!, propSchema]);
          } else {
            mergedProps[key] = propSchema;
          }
        }
      }
      if (objSchema.required) {
        for (const r of objSchema.required) allRequired.add(r);
      }
    }

    return {
      type: "object",
      properties: mergedProps,
      required: [...allRequired],
    } as ObjectSchema;
  }

  // For arrays, merge item schemas
  if (first.type === "array" && rest.every((s) => s.type === "array")) {
    const itemSchemas = schemas
      .filter((s): s is ArraySchema => "items" in s && !!s.items)
      .map((s) => s.items!);
    return {
      type: "array",
      items: itemSchemas.length > 0 ? mergeSchemas(itemSchemas) : undefined,
    } as ArraySchema;
  }

  // Fallback: widen primitive constraints
  if (isPrimitiveSchema(first) && rest.every(isPrimitiveSchema)) {
    const merged: JsonSchema = { ...first };
    for (const s of rest) {
      if ("minimum" in s && s.minimum !== undefined) {
        const curMin = ("minimum" in merged ? merged.minimum : undefined) as number | undefined;
        merged.minimum = curMin !== undefined ? Math.min(curMin, s.minimum!) : s.minimum;
      }
      if ("maximum" in s && s.maximum !== undefined) {
        const curMax = ("maximum" in merged ? merged.maximum : undefined) as number | undefined;
        merged.maximum = curMax !== undefined ? Math.max(curMax, s.maximum!) : s.maximum;
      }
      if ("minLength" in s && s.minLength !== undefined) {
        const curMin = ("minLength" in merged ? merged.minLength : undefined) as number | undefined;
        merged.minLength = curMin !== undefined ? Math.min(curMin, s.minLength!) : s.minLength;
      }
      if ("maxLength" in s && s.maxLength !== undefined) {
        const curMax = ("maxLength" in merged ? merged.maxLength : undefined) as number | undefined;
        merged.maxLength = curMax !== undefined ? Math.max(curMax, s.maxLength!) : s.maxLength;
      }
    }
    return merged;
  }

  // Last resort: anyOf
  return { anyOf: schemas } as AnyOfSchema;
}

function isPrimitiveSchema(s: JsonSchema): boolean {
  return s.type === "string" || s.type === "number" || s.type === "integer" ||
         s.type === "boolean" || s.type === "null";
}

// --- Schema Diffing ---

export interface SchemaDiff {
  type: "added" | "removed" | "changed" | "type_changed";
  path: string;
  before?: unknown;
  after?: unknown;
  description: string;
}

/** Compare two schemas and return differences */
export function diffSchemas(oldSchema: JsonSchema, newSchema: JsonSchema): SchemaDiff[] {
  const diffs: SchemaDiff[] = [];

  function compare(a: JsonSchema, b: JsonSchema, path: string): void {
    // Type change
    if (a.type !== b.type) {
      diffs.push({
        type: "type_changed",
        path,
        before: a.type,
        after: b.type,
        description: `Type changed from ${a.type} to ${b.type}`,
      });
    }

    // Check specific attributes
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of allKeys) {
      if (key === "type" || key === "title" || key === "description") continue;

      const aVal = (a as Record<string, unknown>)[key];
      const bVal = (b as Record<string, unknown>)[key];

      if (aVal === undefined && bVal !== undefined) {
        diffs.push({ type: "added", path: `${path}.${key}`, after: bVal, description: `Added "${key}"` });
      } else if (aVal !== undefined && bVal === undefined) {
        diffs.push({ type: "removed", path: `${path}.${key}`, before: aVal, description: `Removed "${key}"` });
      } else if (aVal !== undefined && bVal !== undefined && JSON.stringify(aVal) !== JSON.stringify(bVal)) {
        if (typeof aVal === "object" && typeof bVal === "object" && aVal !== null && bVal !== null) {
          compare(aVal as JsonSchema, bVal as JsonSchema, `${path}.${key}`);
        } else {
          diffs.push({
            type: "changed",
            path: `${path}.${key}`,
            before: aVal,
            after: bVal,
            description: `"${key}" changed`,
          });
        }
      }
    }

    // Deep compare properties for objects
    if (a.type === "object" && b.type === "object") {
      const aProps = new Set(Object.keys((a as ObjectSchema).properties ?? {}));
      const bProps = new Set(Object.keys((b as ObjectSchema).properties ?? {}));

      for (const prop of bProps) {
        if (!aProps.has(prop)) {
          diffs.push({ type: "added", path: `${path}.properties.${prop}`, description: `Added property "${prop}"` });
        } else {
          compare(
            ((a as ObjectSchema).properties ?? {})[prop]!,
            ((b as ObjectSchema).properties ?? {})[prop]!,
            `${path}.properties.${prop}`,
          );
        }
      }
      for (const prop of aProps) {
        if (!bProps.has(prop)) {
          diffs.push({ type: "removed", path: `${path}.properties.${prop}`, description: `Removed property "${prop}"` });
        }
      }

      // Required changes
      const aReq = new Set((a as ObjectSchema).required ?? []);
      const bReq = new Set((b as ObjectSchema).required ?? []);
      for (const req of bReq) if (!aReq.has(req)) diffs.push({ type: "added", path: `${path}.required`, description: `"${req}" became required` });
      for (const req of aReq) if (!bReq.has(req)) diffs.push({ type: "removed", path: `${path}.required`, description: `"${req}" no longer required` });
    }
  }

  compare(oldSchema, newSchema, "$");
  return diffs;
}

// --- Schema-to-TypeScript Conversion ---

/** Convert a JSON Schema to a TypeScript type definition string */
export function schemaToTypeScript(
  schema: JsonSchema,
  name = "GeneratedType",
  options?: { exportKeyword?: boolean; interfaceStyle?: boolean; indent?: string },
): string {
  const exp = options?.exportKeyword ? "export " : "";
  const style = options?.interfaceStyle ?? true;
  const indent = options?.indent ?? "  ";

  if (style) {
    return `${exp}interface ${name} {\n${schemaToTsBody(schema, indent)}${indent}}`;
  } else {
    return `${exp}type ${name} = ${schemaToTsAlias(schema, indent)};`;
  }
}

function schemaToTsBody(schema: JsonSchema, indent: string): string {
  if (schema.type !== "object" || !schema.properties) return "";

  let body = "";
  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    const optional = !(schema.required?.includes(propName));
    const tsType = schemaToTsType(propSchema, indent + indent);
    const comment = propSchema.description ? `\n${indent}/** ${propSchema.description} */\n${indent}` : "";
    body += `${comment}${propName}${optional ? "?" : ""}: ${tsType};\n${indent}`;
  }

  if (schema.additionalProperties === false) {
    // No index signature needed
  } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    const extraType = schemaToTsType(schema.additionalProperties, indent + indent);
    body += `[key: string]: ${extraType};\n${indent}`;
  }

  return body;
}

function schemaToTsAlias(schema: JsonSchema, indent: string): string {
  if (schema.type === "object" && schema.properties) {
    const entries: string[] = [];
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const optional = !(schema.required?.includes(propName));
      entries.push(`"${propName}"${optional ? "?" : ""}: ${schemaToTsType(propSchema, indent)}`);
    }
    return `{ ${entries.join("; ")} }`;
  }

  return schemaToTsType(schema, indent);
}

function schemaToTsType(schema: JsonSchema, _indent: string): string {
  // Composite schemas
  if ("anyOf" in schema) return schema.anyOf!.map((s) => schemaToTsType(s, _indent)).join(" | ");
  if ("oneOf" in schema) return schema.oneOf!.map((s) => schemaToTsType(s, _indent)).join(" | ");
  if ("allOf" in schema) return schema.allOf!.map((s) => schemaToTsType(s, _indent)).join(" & ");
  if ("$ref" in schema) return schema.$ref!;

  switch (schema.type) {
    case "string": return "string";
    case "number": return "number";
    case "integer": return "number";
    case "boolean": return "boolean";
    case "null": return "null";
    case "any": return "unknown";
    case "array":
      return schema.items ? `Array<${schemaToTsType(schema.items, _indent)}>` : "unknown[]";
    case "object":
      if (schema.properties) {
        const entries: string[] = [];
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          const optional = !(schema.required?.includes(propName));
          entries.push(`"${propName}"${optional ? "?" : ""}: ${schemaToTsType(propSchema, _indent)}`);
        }
        return `{ ${entries.join("; ")} }`;
      }
      return "Record<string, unknown>";
    default:
      return "unknown";
  }
}

// --- Schema Registry ---

/**
 * SchemaRegistry - store and retrieve named schemas with versioning support.
 */
export class SchemaRegistry {
  private schemas = new Map<string, { schema: JsonSchema; version: number; createdAt: Date }>();

  /** Register a schema by name */
  register(name: string, schema: JsonSchema): void {
    const existing = this.schemas.get(name);
    this.schemas.set(name, {
      schema,
      version: existing ? existing.version + 1 : 1,
      createdAt: new Date(),
    });
  }

  /** Retrieve a schema by name */
  get(name: string): JsonSchema | undefined {
    return this.schemas.get(name)?.schema;
  }

  /** Check if a schema exists */
  has(name: string): boolean {
    return this.schemas.has(name);
  }

  /** Remove a schema */
  unregister(name: string): boolean {
    return this.schemas.delete(name);
  }

  /** Get all registered names */
  getNames(): string[] {
    return Array.from(this.schemas.keys());
  }

  /** Get schema version info */
  getVersion(name: string): number | undefined {
    return this.schemas.get(name)?.version;
  }

  /** Resolve a $ref reference against the registry */
  resolveRef($ref: string): JsonSchema | undefined {
    // Strip #/ prefix if present
    const refName = $ref.replace(/^#\//, "").replace(/\//g, ".");
    return this.get(refName) ?? this.get($ref);
  }

  /** Validate data against a registered schema */
  validate(name: string, data: unknown): SchemaValidationResult {
    const schema = this.get(name);
    if (!schema) return { valid: false, errors: [{ path: "$", message: `Schema "${name}" not found` }] };
    return validateSchema(data, schema);
  }

  /** Clear all schemas */
  clear(): void {
    this.schemas.clear();
  }

  /** Get total count of registered schemas */
  get size(): number { return this.schemas.size; }
}

// --- Schema Utilities ---

/** Check if a schema accepts a given value (quick check without collecting errors) */
export function isAcceptedBySchema(value: unknown, schema: JsonSchema): boolean {
  return validateSchema(value, schema).valid;
}

/** Create a schema that requires at least one of the given properties */
export function atLeastOneRequired(properties: string[]): ObjectSchema {
  return {
    type: "object",
    oneOf: properties.map((prop) => ({
      type: "object",
      required: [prop],
    })),
  } as ObjectSchema;
}

/** Create a conditional schema (if-then-else pattern) */
export function conditionalSchema(
  condition: JsonSchema,
  thenSchema: JsonSchema,
  elseSchema?: JsonSchema,
): AllOfSchema {
  const parts: JsonSchema[] = [
    { if: condition, then: thenSchema } as unknown as JsonSchema,
  ];
  if (elseSchema) {
    parts.push({ if: condition, else: elseSchema } as unknown as JsonSchema);
  }
  return { allOf: parts };
}

/** Extract all property paths from a schema (dot notation) */
export function extractPaths(schema: JsonSchema, prefix = ""): string[] {
  const paths: string[] = [];

  if (schema.type === "object" && schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      paths.push(fullPath);
      paths.push(...extractPaths(propSchema, fullPath));
    }
  }

  if (schema.type === "array" && schema.items) {
    const arrayPath = prefix ? `${prefix}[]` : "[]";
    paths.push(arrayPath);
    paths.push(...extractPaths(schema.items, arrayPath));
  }

  return paths;
}

/** Get the default value defined in a schema */
export function getDefault(schema: JsonSchema): unknown {
  if ("default" in schema && schema.default !== undefined) {
    return schema.default;
  }
  if (schema.type === "object" && schema.properties) {
    const defaults: Record<string, unknown> = {};
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const d = getDefault(propSchema);
      if (d !== undefined) defaults[key] = d;
    }
    return Object.keys(defaults).length > 0 ? defaults : undefined;
  }
  if (schema.type === "array" && schema.items) {
    return [];
  }
  return undefined;
}
