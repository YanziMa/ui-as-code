/**
 * Configuration Management: Type-safe, schema-validated configuration with
 * environment variable binding, layered overrides (default → env → file → runtime),
 * change notifications, frozen production mode, and path-based access.
 */

// --- Types ---

export type ConfigValue = string | number | boolean | null | undefined | Record<string, unknown> | unknown[];
export type ConfigSchema = Record<string, ConfigSchemaEntry>;
export type Environment = "development" | "staging" | "production" | "test";

export interface ConfigSchemaEntry {
  /** Description of the config value */
  description?: string;
  /** Default value */
  default?: ConfigValue;
  /** Expected type for validation */
  type?: "string" | "number" | "boolean" | "object" | "array";
  /** Whether this value is required */
  required?: boolean;
  /** Validation function — return error message or empty string if valid */
  validate?: (value: ConfigValue) => string | undefined;
  /** Environment variable name to bind from */
  env?: string;
  /** Transform function applied after reading from env */
  transform?: (raw: string) => ConfigValue;
  /** Whether to allow runtime changes (default: true) */
  immutable?: boolean;
  /** Mask in logs/output (for secrets) */
  secret?: boolean;
}

export interface ConfigOptions {
  /** Application environment */
  environment?: Environment;
  /** Prefix for environment variables (e.g., "APP_") */
  envPrefix?: string;
  /** Whether to throw on invalid config (default: false) */
  strict?: boolean;
  /** Whether to freeze the config after initialization (production mode) */
  freezeOnInit?: boolean;
  /** Called when a config value changes */
  onChange?: (key: string, oldValue: ConfigValue, newValue: ConfigValue) => void;
}

export interface ConfigSource {
  name: string;
  priority: number; // Higher = higher priority
  load(): Promise<Record<string, ConfigValue>>;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: Array<{ key: string; message: string }>;
  warnings: Array<{ key: string; message: string }>;
}

// --- Config Manager ---

/**
 * Centralized configuration manager with schema validation,
 * environment variable binding, layered sources, and change tracking.
 *
 * @example
 * const config = new ConfigManager({
 *   database: { url: { type: "string", required: true, env: "DATABASE_URL", secret: true } },
 *   api: { timeout: { type: "number", default: 30000 }, retries: { type: "number", default: 3 } },
 *   features: { darkMode: { type: "boolean", default: false } },
 * });
 *
 * config.get("database.url");       // → reads DATABASE_URL env var
 * config.get<number>("api.timeout"); // → 30000
 * config.set("features.darkMode", true);
 */
export class ConfigManager {
  private data: Record<string, ConfigValue> = {};
  private schema: ConfigSchema = {};
  private options: Required<Pick<ConfigOptions, "strict" | "freezeOnInit">> & ConfigOptions;
  private listeners = new Set<(key: string, oldVal: ConfigValue, newVal: ConfigValue) => void>();
  private initialized = false;
  private changeLog: Array<{ key: string; oldValue: ConfigValue; newValue: ConfigValue; timestamp: number }> = [];

  constructor(schema: ConfigSchema = {}, options: ConfigOptions = {}) {
    this.schema = schema;
    this.options = {
      environment: options.environment ?? this.detectEnvironment(),
      envPrefix: options.envPrefix ?? "",
      strict: options.strict ?? false,
      freezeOnInit: options.freezeOnInit ?? false,
      onChange: options.onChange,
    };

    // Apply defaults from schema
    this.applyDefaults();
    // Bind environment variables
    this.bindEnvVars();
  }

  /** Get a config value by dot-path key */
  get<T = ConfigValue>(key: string): T {
    const value = this.resolvePath(key);
    return value as T;
  }

  /** Get a config value with a fallback */
  getOr<T = ConfigValue>(key: string, fallback: T): T {
    const value = this.resolvePath(key);
    return (value ?? fallback) as T;
  }

  /** Check if a key exists */
  has(key: string): boolean {
    return this.resolvePath(key) !== undefined;
  }

  /** Set a config value by dot-path key */
  set(key: string, value: ConfigValue): void {
    if (this.options.freezeOnInit && this.initialized) {
      const entry = this.findSchemaEntry(key);
      if (entry?.immutable !== false) {
        throw new Error(`[Config] Cannot set "${key}" — config is frozen (production mode)`);
      }
    }

    // Validate against schema
    const validation = this.validateKey(key, value);
    if (!validation.valid && this.options.strict) {
      throw new Error(`[Config] Validation failed for "${key}": ${validation.errors.map((e) => e.message).join(", ")}`);
    }

    const oldValue = this.resolvePath(key);
    this.setPath(key, value);

    // Notify listeners
    this.listeners.forEach((fn) => fn(key, oldValue, value));
    this.options.onChange?.(key, oldValue, value);

    // Log change
    this.changeLog.push({ key, oldValue, newValue: value, timestamp: Date.now() });
  }

  /** Set multiple values at once */
  setMany(values: Record<string, ConfigValue>): void {
    for (const [key, value] of Object.entries(values)) {
      this.set(key, value);
    }
  }

  /** Listen for config changes */
  onChange(listener: (key: string, oldValue: ConfigValue, newValue: ConfigValue) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Load values from a config source (file, remote, etc.) */
  async loadSource(source: ConfigSource): Promise<void> {
    const values = await source.load();
    for (const [key, value] of Object.entries(values)) {
      // Only set if not already set by a higher-priority source
      if (!this.has(key)) {
        this.set(key, value);
      }
    }
  }

  /** Validate all current values against the schema */
  validate(): ConfigValidationResult {
    const errors: Array<{ key: string; message: string }> = [];
    const warnings: Array<{ key: string; message: string }> = [];

    this.validateSchema(this.schema, "", errors, warnings);

    return { valid: errors.length === 0, errors, warnings };
  }

  /** Initialize — validate, apply env vars, optionally freeze */
  init(): ConfigValidationResult {
    this.bindEnvVars(); // Re-bind in case new env vars appeared
    const result = this.validate();

    if (!result.valid && this.options.strict) {
      console.error("[Config] Initialization errors:", result.errors);
    }

    this.initialized = true;

    if (this.options.freezeOnInit && this.options.environment === "production") {
      Object.freeze(this.data);
    }

    return result;
  }

  /** Get all current config values (secrets masked) */
  getAll(maskSecrets = true): Record<string, ConfigValue> {
    if (!maskSecrets) return { ...this.data };

    const result: Record<string, ConfigValue> = {};
    for (const [key, value] of Object.entries(this.data)) {
      const entry = this.findSchemaEntry(key);
      result[key] = entry?.secret ? "***" : value;
    }
    return result;
  }

  /** Get the raw data object (no masking) */
  getRaw(): Record<string, ConfigValue> {
    return { ...this.data };
  }

  /** Get change history */
  getChangeHistory(limit?: number): typeof this.changeLog {
    return limit ? this.changeLog.slice(-limit) : [...this.changeLog];
  }

  /** Get the current environment */
  get environment(): Environment {
    return this.options.environment!;
  }

  /** Export config as JSON (safe for logging) */
  toJSON(): string {
    return JSON.stringify(this.getAll(true), null, 2);
  }

  /** Reset all values to schema defaults */
  reset(): void {
    this.data = {};
    this.changeLog = [];
    this.applyDefaults();
    this.bindEnvVars();
  }

  // --- Private ---

  private detectEnvironment(): Environment {
    if (typeof process !== "undefined" && process.env?.NODE_ENV) {
      const env = process.env.NODE_ENV;
      if (["development", "staging", "production", "test"].includes(env)) {
        return env as Environment;
      }
    }
    return "development";
  }

  private applyDefaults(): void {
    this.applyDefaultsToSchema(this.schema, "");
  }

  private applyDefaultsToSchema(schema: ConfigSchema, prefix: string): void {
    for (const [key, entry] of Object.entries(schema)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (entry.default !== undefined) {
        this.setPath(fullKey, entry.default);
      }
      if ("type" in entry || "default" in entry || "env" in entry) {
        // Leaf node — already handled above
      } else if (typeof entry === "object" && entry !== null) {
        // Nested schema group
        this.applyDefaultsToSchema(entry as ConfigSchema, fullKey);
      }
    }
  }

  private bindEnvVars(): void {
    this.bindEnvVarsToSchema(this.schema, "");
  }

  private bindEnvVarsToSchema(schema: ConfigSchema, prefix: string): void {
    for (const [key, entry] of Object.entries(schema)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if ("env" in entry && (entry as ConfigSchemaEntry).env) {
        const envName = this.options.envPrefix + (entry as ConfigSchemaEntry).env!;
        const envValue = this.readEnvVar(envName, entry as ConfigSchemaEntry);
        if (envValue !== undefined) {
          this.setPath(fullKey, envValue);
        }
      } else if (!(("type" in entry) || ("default" in entry) || ("env" in entry))) {
        // Nested group
        this.bindEnvVarsToSchema(entry as ConfigSchema, fullKey);
      }
    }
  }

  private readEnvVar(name: string, entry: ConfigSchemaEntry): ConfigValue | undefined {
    let value: string | undefined;

    if (typeof process !== "undefined" && process.env) {
      value = process.env[name];
    } else if (typeof window !== "undefined") {
      // In browser, check import.meta.env or window.__env__
      value = (import.meta as any)?.env?.[name]
        ?? (window as any).__env__?.[name];
    }

    if (value === undefined || value === "") return undefined;

    // Apply transform if provided
    if (entry.transform) return entry.transform(value);

    // Auto-coerce based on type
    if (entry.type === "boolean") {
      return value === "true" || value === "1";
    }
    if (entry.type === "number") {
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    }

    return value;
  }

  private resolvePath(path: string): ConfigValue {
    const parts = path.split(".");
    let current: unknown = this.data;

    for (const part of parts) {
      if (current == null || typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current as ConfigValue;
  }

  private setPath(path: string, value: ConfigValue): void {
    const parts = path.split(".");
    let current = this.data;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (current[part] == null || typeof current[part] !== "object" || Array.isArray(current[part])) {
        current[part] = {};
      }
      current = current[part] as Record<string, ConfigValue>;
    }

    current[parts[parts.length - 1]!] = value;
  }

  private findSchemaEntry(key: string): ConfigSchemaEntry | undefined {
    const parts = key.split(".");
    let current: unknown = this.schema;

    for (const part of parts) {
      if (current == null || typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    const entry = current as ConfigSchemaEntry | ConfigSchema;
    if ("type" in entry || "default" in entry || "env" in entry || "validate" in entry) {
      return entry as ConfigSchemaEntry;
    }
    return undefined;
  }

  private validateKey(key: string, value: ConfigValue): ConfigValidationResult {
    const errors: Array<{ key: string; message: string }> = [];
    const warnings: Array<{ key: string; message: string }> = [];
    const entry = this.findSchemaEntry(key);

    if (!entry) return { valid: true, errors, warnings };

    // Type check
    if (entry.type) {
      const actualType = Array.isArray(value) ? "array"
        : value === null ? "null"
        : typeof value;
      if (actualType !== entry.type && actualType !== "null") {
        errors.push({ key, message: `Expected type ${entry.type}, got ${actualType}` });
      }
    }

    // Custom validator
    if (entry.validate) {
      const error = entry.validate(value);
      if (error) errors.push({ key, message: error });
    }

    // Required check
    if (entry.required && (value === undefined || value === null)) {
      errors.push({ key, message: "Required value is missing" });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private validateSchema(
    schema: ConfigSchema,
    prefix: string,
    errors: Array<{ key: string; message: string }>,
    warnings: Array<{ key: string; message: string }>,
  ): void {
    for (const [key, entry] of Object.entries(schema)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if ("type" in entry || "default" in entry || "env" in entry || "validate" in entry) {
        const value = this.resolvePath(fullKey);
        const result = this.validateKey(fullKey, value);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      } else if (typeof entry === "object" && entry !== null) {
        this.validateSchema(entry as ConfigSchema, fullKey, errors, warnings);
      }
    }
  }
}

/** Create a pre-configured ConfigManager */
export function createConfig(schema: ConfigSchema, options?: ConfigOptions): ConfigManager {
  return new ConfigManager(schema, options);
}
