/**
 * Schema Validation Utilities: JSON Schema-style validation, type checking,
 * nested object/array validation, custom schema builders, validation result
 * formatting, and composable schema rules.
 */

// --- Types ---

export type SchemaType = "string" | "number" | "integer" | "boolean" | "null" | "object" | "array" | "any";

export interface SchemaProperty {
  /** Expected type */
  type?: SchemaType | SchemaType[];
  /** Required (must be present and non-null) */
  required?: boolean;
  /** Default value if missing */
  default?: unknown;
  /** Enum of allowed values */
  enum?: unknown[];
  /** Minimum value (for numbers) or length (for strings/arrays) */
  min?: number;
  /** Maximum value or length */
  max?: number;
  /** Regex pattern for strings */
  pattern?: string | RegExp;
  /** Minimum number of items in array */
  minItems?: number;
  /** Maximum number of items in array */
  maxItems?: number;
  /** Unique items required */
  uniqueItems?: boolean;
  /** Nested properties schema (for objects) */
  properties?: Record<string, SchemaProperty>;
  /** Required property names (for objects) */
  requiredProperties?: string[];
  /** Items schema (for arrays) */
  items?: SchemaProperty | SchemaProperty[];
  /** Additional properties allowed (for objects) */
  additionalProperties?: boolean | SchemaProperty;
  /** Custom validator function */
  validate?: (value: unknown, path: string) => string | null;
  /** Human-readable description */
  description?: string;
  /** Example value */
  example?: unknown;
  /** Format hint (email, uri, date, etc.) */
  format?: string;
}

export interface SchemaDefinition {
  /** Root schema type */
  type?: SchemaType | SchemaType[];
  /** Properties (for objects) */
  properties?: Record<string, SchemaProperty>;
  /** Required fields */
  required?: string[];
  /** Additional properties allowed */
  additionalProperties?: boolean | SchemaProperty;
  /** Array item schema */
  items?: SchemaProperty | SchemaProperty[];
  /** $ref to another schema */
  $ref?: string;
  /** All-of / any-of / one-of composition */
  allOf?: SchemaDefinition[];
  anyOf?: SchemaDefinition[];
  oneOf?: SchemaDefinition[];
  /** Not (must not match this schema) */
  not?: SchemaDefinition;
  /** Description */
  description?: string;
  /** Title */
  title?: string;
  /** Custom root-level validator */
  validate?: (value: unknown) => string | null;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
  /** The validated data (possibly with defaults applied) */
  data: unknown;
}

export interface SchemaValidationError {
  path: string; // dot-notation path to the field
  message: string;
  value: unknown; // the actual value that failed
  keyword: string; // which rule failed (type, required, min, enum, etc.)
}

// --- Format Validators ---

const FORMAT_VALIDATORS: Record<string, (value: string) => boolean> = {
  "email": (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  "uri": (v) => /^https?:\/\/.+/i.test(v),
  "url": (v) => /^https?:\/\/.+/i.test(v),
  "date": (v) => !isNaN(Date.parse(v)),
  "date-time": (v) => !isNaN(Date.parse(v)),
  "time": (v) => /^\d{2}:\d{2}(:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(v),
  "hostname": (v) => /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)*[a-zA-Z]{2,}$/.test(v),
  "ipv4": (v) => /^(\d{1,3}\.){3}\d{1,3}$/.test(v),
  "ipv6": (v) => /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(v),
  "uuid": (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v),
  "color-hex": (v) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v),
  "alpha": (v) => /^[a-zA-Z]+$/.test(v),
  "alphanumeric": (v) => /^[a-zA-Z0-9]+$/.test(v),
};

// --- Core Validator ---

/**
 * Validate a value against a SchemaDefinition.
 *
 * @example
 * ```ts
 * const userSchema: SchemaDefinition = {
 *   type: "object",
 *   required: ["name", "email"],
 *   properties: {
 *     name: { type: "string", minLength: 1 },
 *     email: { type: "string", format: "email" },
 *     age: { type: "integer", min: 0, max: 150 },
 *   },
 * };
 * const result = validateSchema({ name: "Alice", email: "alice@example.com" }, userSchema);
 * console.log(result.valid); // true
 * ```
 */
export function validateSchema(
  data: unknown,
  schema: SchemaDefinition,
  options?: { applyDefaults?: boolean },
): SchemaValidationResult {
  const errors: SchemaValidationError[] = [];
  const applyDefaults = options?.applyDefaults ?? true;

  const validated = applyDefaults ? _applyDefaults(data, schema) : data;

  _validateRecursive(validated, schema, "", errors);

  return {
    valid: errors.length === 0,
    errors,
    data: validated,
  };
}

/** Quick type check — returns error message or null */
export function checkType(value: unknown, expected: SchemaType | SchemaType[]): string | null {
  if (Array.isArray(expected)) {
    if (!expected.some((t) => _isOfType(value, t))) {
      return `Expected one of types [${expected.join(", ")}], got ${_typeName(value)}`;
    }
    return null;
  }

  if (!_isOfType(value, expected)) {
    return `Expected type ${expected}, got ${_typeName(value)}`;
  }
  return null;
}

// --- Internal ---

function _validateRecursive(
  data: unknown,
  schema: SchemaDefinition | SchemaProperty,
  path: string,
  errors: SchemaValidationError[],
): void {
  // Custom validator
  if (schema.validate) {
    const err = schema.validate(data);
    if (err) errors.push({ path, message: err, value: data, keyword: "custom" });
  }

  // Type check
  if (schema.type) {
    const typeErr = checkType(data, schema.type);
    if (typeErr) errors.push({ path, message: typeErr, value: data, keyword: "type" });
    // Don't continue type-specific checks if type is wrong
    if (typeErr && schema.type !== "any") return;
  }

  // Required check (for objects)
  if (schema.required && typeof data === "object" && data !== null && !Array.isArray(data)) {
    for (const reqField of schema.required) {
      if (!(data as Record<string, unknown>)[reqField]) {
        errors.push({
          path: `${path ? path + "." : ""}${reqField}`,
          message: `Required field "${reqField}" is missing`,
          value: undefined,
          keyword: "required",
        });
      }
    }
  }

  // Enum check
  if (schema.enum !== undefined) {
    if (!schema.enum.includes(data)) {
      errors.push({
        path,
        message: `Value must be one of: ${schema.enum.map(String).join(", ")}`,
        value: data,
        keyword: "enum",
      });
    }
  }

  // Min/max checks
  if (schema.min !== undefined) {
    if (typeof data === "number") {
      if (data < schema.min) errors.push({ path, message: `Value must be >= ${schema.min}`, value: data, keyword: "minimum" });
    } else if (typeof data === "string") {
      if (data.length < schema.min) errors.push({ path, message: `Length must be >= ${schema.min}`, value: data, keyword: "minLength" });
    } else if (Array.isArray(data)) {
      if (data.length < schema.min) errors.push({ path, message: `Array must have >= ${schema.min} items`, value: data, keyword: "minItems" });
    }
  }

  if (schema.max !== undefined) {
    if (typeof data === "number") {
      if (data > schema.max) errors.push({ path, message: `Value must be <= ${schema.max}`, value: data, keyword: "maximum" });
    } else if (typeof data === "string") {
      if (data.length > schema.max) errors.push({ path, message: `Length must be <= ${schema.max}`, value: data, keyword: "maxLength" });
    } else if (Array.isArray(data)) {
      if (data.length > schema.max) errors.push({ path, message: `Array must have <= ${schema.max} items`, value: data, keyword: "maxItems" });
    }
  }

  // Pattern check
  if (schema.pattern && typeof data === "string") {
    const regex = schema.pattern instanceof RegExp ? schema.pattern : new RegExp(schema.pattern);
    if (!regex.test(data)) {
      errors.push({ path, message: `Value does not match pattern ${regex}`, value: data, keyword: "pattern" });
    }
  }

  // Format check
  if (schema.format && typeof data === "string") {
    const validator = FORMAT_VALIDATORS[schema.format];
    if (validator && !validator(data)) {
      errors.push({ path, message: `Invalid ${schema.format} format`, value: data, keyword: "format" });
    }
  }

  // Object properties
  if (schema.properties && typeof data === "object" && data !== null && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const propPath = path ? `${path}.${propName}` : propName;
      const propValue = obj[propName];

      // Check required
      if (propSchema.required && (propValue === undefined || propValue === null)) {
        errors.push({ path: propPath, message: `Required property "${propName}" is missing`, value: propValue, keyword: "required" });
        continue;
      }

      if (propValue !== undefined && propValue !== null) {
        _validateRecursive(propValue, propSchema, propPath, errors);
      }
    }

    // Additional properties
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(obj)) {
        if (!schema.properties![key]) {
          errors.push({ path: `${path ? path + "." : ""}${key}`, message: `Additional property "${key}" is not allowed`, value: obj[key], keyword: "additionalProperties" });
        }
      }
    } else if (typeof schema.additionalProperties === "object") {
      for (const key of Object.keys(obj)) {
        if (!schema.properties![key]) {
          _validateRecursive(obj[key], schema.additionalProperties, `${path ? path + "." : ""}${key}`, errors);
        }
      }
    }
  }

  // Array items
  if (schema.items && Array.isArray(data)) {
    if (Array.isArray(schema.items)) {
      // Tuple validation
      data.forEach((item, idx) => {
        const itemSchema = schema.items[idx];
        if (itemSchema) {
          _validateRecursive(item, itemSchema, `${path}[${idx}]`, errors);
        }
      });
    } else {
      // Uniform array validation
      data.forEach((item, idx) => {
        _validateRecursive(item, schema.items!, `${path}[${idx}]`, errors);
      });

      // Unique items
      if (schema.uniqueItems) {
        const seen = new Set<unknown>();
        data.forEach((item, idx) => {
          const key = JSON.stringify(item);
          if (seen.has(key)) {
            errors.push({ path: `${path}[${idx}]`, message: `Duplicate value at index ${idx}`, value: item, keyword: "uniqueItems" });
          }
          seen.add(key);
        });
      }
    }
  }

  // Composition: allOf, anyOf, oneOf
  if (schema.allOf) {
    for (const subSchema of schema.allOf) {
      _validateRecursive(data, subSchema, path, errors);
    }
  }

  if (schema.anyOf) {
    const subErrors: SchemaValidationError[][] = [];
    let matched = false;
    for (const subSchema of schema.anyOf) {
      const subErrorsArr: SchemaValidationError[] = [];
      _validateRecursive(data, subSchema, path, subErrorsArr);
      if (subErrorsArr.length === 0) matched = true;
      subErrors.push(subErrorsArr);
    }
    if (!matched) {
      errors.push({ path, message: `Value does not match any of the allowed schemas`, value: data, keyword: "anyOf" });
    }
  }

  if (schema.oneOf) {
    const matchCount = schema.oneOf.filter((sub) => {
      const subErrorsArr: SchemaValidationError[] = [];
      _validateRecursive(data, sub, path, subErrorsArr);
      return subErrorsArr.length === 0;
    }).length;
    if (matchCount !== 1) {
      errors.push({ path, message: `Value must match exactly one schema (matched ${matchCount})`, value: data, keyword: "oneOf" });
    }
  }

  if (schema.not) {
    const subErrorsArr: SchemaValidationError[] = [];
    _validateRecursive(data, schema.not, path, subErrorsArr);
    if (subErrorsArr.length === 0) {
      errors.push({ path, message: `Value must NOT match the given schema`, value: data, keyword: "not" });
    }
  }
}

function _applyDefaults(data: unknown, schema: SchemaDefinition | SchemaProperty): unknown {
  if (data === undefined || data === null) {
    if (schema.default !== undefined) return schema.default;
    return data;
  }

  if (schema.properties && typeof data === "object" && !Array.isArray(data)) {
    const obj = { ...data } as Record<string, unknown>;
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (obj[key] === undefined && prop.default !== undefined) {
        obj[key] = prop.default;
      } else if (obj[key] !== undefined && obj[key] !== null) {
        obj[key] = _applyDefaults(obj[key], prop);
      }
    }
    return obj;
  }

  if (schema.items && Array.isArray(data)) {
    return data.map((item) =>
      typeof schema.items === "object" && !Array.isArray(schema.items)
        ? _applyDefaults(item, schema.items)
        : item,
    );
  }

  return data;
}

function _isOfType(value: unknown, type: SchemaType): boolean {
  switch (type) {
    case "string": return typeof value === "string";
    case "number": return typeof value === "number";
    case "integer": return Number.isInteger(value);
    case "boolean": return typeof value === "boolean";
    case "null": return value === null;
    case "object": return typeof value === "object" && value !== null && !Array.isArray(value);
    case "array": return Array.isArray(value);
    case "any": return true;
  }
}

function _typeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

// --- Schema Builder Helpers ---

/** Create a simple object schema builder */
export function objectSchema(
  properties: Record<string, SchemaProperty>,
  required?: string[],
): SchemaDefinition {
  return { type: "object", properties, required };
}

/** Create an array schema builder */
export function arraySchema(items: SchemaProperty, options?: { minItems?: number; maxItems?: number }): SchemaDefinition {
  return { type: "array", items, ...options };
}

/** Create a string property with common constraints */
export function strProp(options?: { minLength?: number; maxLength?: number; pattern?: string | RegExp; format?: string; enum?: string[] }): SchemaProperty {
  return { type: "string", ...options };
}

/** Create a number property */
export function numProp(options?: { min?: number; max?: number; integer?: boolean }): SchemaProperty {
  return { type: options?.integer ? "integer" : "number", ...options };
}
