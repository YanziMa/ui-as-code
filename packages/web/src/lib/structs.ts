/**
 * Struct — immutable typed record with validation, lenses, and serialization.
 */

// --- Types ---

export type FieldDef<T> = {
  name: string;
  required?: boolean;
  defaultValue?: T;
  validate?: (value: T) => string | null;
  transform?: (value: unknown) => T;
};

export interface StructSchema<T extends Record<string, unknown>> {
  [K in keyof T]: FieldDef<T[K]>;
}

export interface StructOptions {
  /** Freeze the struct (deep freeze) */
  frozen?: boolean;
  /** Allow extra properties not in schema */
  allowExtra?: boolean;
}

// --- Struct Class ---

/**
 * Immutable struct with typed fields.
 *
 * @example
 * const User = defineStruct({
 *   name: { name: 'name', required: true },
 *   age: { name: 'age', defaultValue: 0 },
 * });
 * const u = new User({ name: 'Alice' });
 */
export class Struct<T extends Record<string, unknown>> {
  private _data: T;

  constructor(
    private schema: StructSchema<T>,
    data: Partial<T>,
    options?: StructOptions,
  ) {
    this._data = this._validateAndBuild(data, options);
  }

  /** Get a field value */
  get<K extends keyof T>(key: K): T[K] {
    return this._data[key];
  }

  /** Get all data as plain object */
  toObject(): T {
    return { ...this._data };
  }

  /** Get all field names */
  get keys(): (keyof T)[] {
    return Object.keys(this.schema) as (keyof T)[];
  }

  /** Get all values */
  values(): T[keyof T][] {
    return Object.values(this._data) as T[keyof T][];
  }

  /** Get entries */
  entries(): Array<[keyof T, T[keyof T]]> {
    return Object.entries(this._data) as Array<[keyof T, T[keyof T]]>;
  }

  /** Check if a field has its default value */
  isDefault<K extends keyof T>(key: K): boolean {
    const def = this.schema[key]?.defaultValue;
    return def !== undefined && this._data[key] === def;
  }

  /** Check if a field has a non-default value (is "set") */
  isSet<K extends keyof T>(key: K): boolean {
    return !this.isDefault(key);
  }

  /** Create a new struct with updated fields (immutable update) */
  set<P extends Partial<T>>(patch: P): Struct<T> {
    return new Struct(this.schema, { ...this._data, ...patch });
  }

  /** Create a new struct with only specified fields */
  pick<K extends keyof T>(keys: K[]): PickStruct<T, K> {
    const picked = {} as Pick<T, K>;
    for (const k of keys) picked[k] = this._data[k];
    return new Struct(this.schema as unknown as StructSchema<Pick<T, K>>, picked);
  }

  /** Create a new struct excluding specified fields */
  omit<K extends keyof T>(keys: K[]): OmitStruct<T, K> {
    const remaining = { ...this._data };
    for (const k of keys) delete remaining[k];
    return new Struct(this.schema as unknown as StructSchema<Omit<T, K>>, remaining);
  }

  /** Merge with another struct's data */
  merge(other: Struct<T> | Partial<T>): Struct<T> {
    const otherData = other instanceof Struct ? other.toObject() : other;
    return this.set(otherData as Partial<T>);
  }

  /** Clone (returns same struct since already immutable) */
  clone(): Struct<T> {
    return new Struct(this.schema, { ...this._data });
  }

  /** Convert to JSON string */
  toJSON(): string {
    return JSON.stringify(this._data);
  }

  /** Convert to URLSearchParams */
  toSearchParams(): URLSearchParams {
    const params = new URLSearchParams();
    for (const [k, v] of this.entries()) {
      if (v != null) params.set(String(k), String(v));
    }
    return params;
  }

  /** Validate against schema, returning errors */
  validate(): string[] {
    const errors: string[] = [];
    for (const [key, fieldDef] of Object.entries(this.schema)) {
      const value = this._data[key as keyof T];
      if (fieldDef.required && (value === undefined || value === null)) {
        errors.push(`${fieldDef.name} is required`);
      } else if (fieldDef.validate && value !== undefined && value !== null) {
        const err = fieldDef.validate(value as never);
        if (err) errors.push(`${fieldDef.name}: ${err}`);
      }
    }
    return errors;
  }

  /** Check if valid */
  isValid(): boolean {
    return this.validate().length === 0;
  }

  /** Equality check */
  equals(other: Struct<T>): boolean {
    return this.toJSON() === other.toJSON();
  }

  private _validateAndBuild(data: Partial<T>, options?: StructOptions): T {
    const result = {} as T;
    const allowExtra = options?.allowExtra ?? false;

    // Apply defaults and transforms from schema
    for (const [key, fieldDef] of Object.entries(this.schema)) {
      let value = data[key as keyof T];

      if (value === undefined || value === null) {
        if (fieldDef.defaultValue !== undefined) {
          value = fieldDef.defaultValue as T[keyof T & string];
        } else if (fieldDef.required) {
          throw new Error(`Struct: ${fieldDef.name} is required`);
        }
      }

      if (value !== undefined && fieldDef.transform) {
        value = fieldDef.transform(value) as T[keyof T & string];
      }

      (result as Record<string, unknown>)[key] = value;
    }

    // Allow extra fields
    if (allowExtra) {
      for (const [key, value] of Object.entries(data)) {
        if (!(key in result)) (result as Record<string, unknown>)[key] = value;
      }
    }

    return result;
  }
}

/** Type helper for picked struct */
export type PickStruct<T, K extends keyof T> = T extends infer R
  ? { [P in K]: R[P & keyof R] }
  : never;

/** Type helper for omitted struct */
export type OmitStruct<T, K extends keyof T> = T extends infer R
  ? { [P in Exclude<keyof R, K>]: R[P & keyof R] }
  : never;

// --- Factory ---

/** Define a struct schema and create a constructor function */
export function defineStruct<T extends Record<string, unknown>>(
  schema: StructSchema<T>,
  defaultOptions?: StructOptions,
): new (data?: Partial<T>) => Struct<T> {
  return class extends Struct<T> {
    constructor(data?: Partial<T>) {
      super(schema, data ?? {}, defaultOptions);
    }
  } as unknown as new (data?: Partial<T>) => Struct<T>;
}

// --- Lens ---

/** Create a lens for deep property access on structs */
export function lens<T, V>(
  getter: (s: T) => V,
  setter: (s: T, v: V) => T,
): { get: (s: T) => V; set: (s: T, v: V) => T } {
  return { get: getter, set: setter };
}

/** Compose two lenses */
export function composeLens<A, B, C>(
  ab: { get: (a: A) => B; set: (a: A, b: B) => A },
  bc: { get: (b: B) => C; set: (b: B, c: C) => B },
): { get: (a: A) => C; set: (a: A, c: C) => A } {
  return {
    get: (a) => bc.get(ab.get(a)),
    set: (a, c) => ab.set(a, bc.set(ab.get(a), c)),
  };
}
