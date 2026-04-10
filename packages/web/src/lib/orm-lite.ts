/**
 * Lightweight ORM / Query Builder for in-memory or adapter-based data access.
 * Supports: model definitions, query chain (where/order/limit/skip),
 * relations, migrations, schema validation, and CRUD operations.
 */

// --- Types ---

export type FieldType = "string" | "number" | "boolean" | "date" | "json" | "text";

export interface FieldDefinition {
  name: string;
  type: FieldType;
  primary?: boolean;
  unique?: boolean;
  nullable?: boolean;
  defaultValue?: unknown;
  /** For string fields */
  maxLength?: number;
  /** For number fields */
  min?: number;
  max?: number;
  /** Custom validator */
  validate?: (value: unknown) => boolean | string;
}

export interface SchemaDefinition {
  tableName: string;
  fields: FieldDefinition[];
  /** Timestamps auto-managed */
  timestamps?: boolean;
  /** Soft delete support */
  softDelete?: boolean;
}

export interface ModelInstance<T = Record<string, unknown>> {
  id: string;
  data: T;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface QueryOptions<T = Record<string, unknown>> {
  where?: FilterCondition<T>;
  orderBy?: OrderByClause<T>[];
  limit?: number;
  skip?: number;
  select?: (keyof T)[];
  include?: RelationInclude[];
}

export interface FilterCondition<T = Record<string, unknown>> {
  [K in keyof T]?: T[K] | FilterOperator<T, K>;
}

export interface FilterOperator<T, K extends keyof T> {
  eq?: T[K];
  neq?: T[K];
  gt?: T[K];
  gte?: T[K];
  lt?: T[K];
  lte?: T[K];
  in?: T[K][];
  nin?: T[K][];
  like?: string;
  notLike?: string;
  exists?: boolean;
  between?: [T[K], T[K]];
  contains?: T[K] extends Array<unknown> ? T[K] : never;
}

export interface OrderByClause<T = Record<string, unknown>> {
  field: keyof T;
  direction: "asc" | "desc";
}

export interface RelationInclude {
  field: string;
  where?: FilterCondition;
  limit?: number;
}

export interface MigrationOperation {
  type: "createTable" | "dropTable" | "addColumn" | "dropColumn" | "renameColumn" | "addIndex" | "dropIndex";
  table: string;
  column?: string;
  definition?: FieldDefinition;
  newName?: string;
  indexName?: string;
  columns?: string[];
}

export interface MigrationResult {
  success: boolean;
  operations: MigrationOperation[];
  errors: string[];
}

// --- Schema Validator ---

function validateFieldValue(value: unknown, def: FieldDefinition): string | null {
  if (value === undefined || value === null) {
    if (!def.nullable && def.defaultValue === undefined) {
      return `Field "${def.name}" is required`;
    }
    return null;
  }

  switch (def.type) {
    case "string":
      if (typeof value !== "string") return `"${def.name}" must be a string`;
      if (def.maxLength && value.length > def.maxLength)
        return `"${def.name}" exceeds max length ${def.maxLength}`;
      break;

    case "number":
      if (typeof value !== "number") return `"${def.name}" must be a number`;
      if (def.min !== undefined && value < def.min)
        return `"${def.name}" must be >= ${def.min}`;
      if (def.max !== undefined && value > def.max)
        return `"${def.name}" must be <= ${def.max}`;
      break;

    case "boolean":
      if (typeof value !== "boolean") return `"${def.name}" must be a boolean`;
      break;

    case "date":
      if (!(value instanceof Date) && typeof value !== "string")
        return `"${def.name}" must be a date or date string`;
      break;

    case "json":
      try {
        if (typeof value === "string") JSON.parse(value as string);
      } catch {
        return `"${def.name}" must be valid JSON`;
      }
      break;

    case "text":
      if (typeof value !== "string") return `"${def.name}" must be text`;
      break;
  }

  if (def.validate) {
    const result = def.validate(value);
    if (result !== true) return typeof result === "string" ? result : `"${def.name}" validation failed`;
  }

  return null;
}

// --- In-Memory Store ---

class MemoryStore<T = Record<string, unknown>> {
  private records: Map<string, ModelInstance<T>> = new Map();
  private idCounter = 0;

  generateId(): string {
    this.idCounter++;
    return `${Date.now().toString(36)}_${this.idCounter.toString(36)}`;
  }

  insert(data: T): ModelInstance<T> {
    const now = new Date();
    const instance: ModelInstance<T> = {
      id: this.generateId(),
      data,
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(instance.id, instance);
    return instance;
  }

  update(id: string, data: Partial<T>): ModelInstance<T> | null {
    const existing = this.records.get(id);
    if (!existing) return null;
    existing.data = { ...existing.data, ...data } as T;
    existing.updatedAt = new Date();
    return existing;
  }

  delete(id: string): boolean {
    return this.records.delete(id);
  }

  find(id: string): ModelInstance<T> | null {
    return this.records.get(id) ?? null;
  }

  findAll(): ModelInstance<T>[] {
    return Array.from(this.records.values());
  }

  count(): number {
    return this.records.size;
  }

  clear(): void {
    this.records.clear();
    this.idCounter = 0;
  }
}

// --- Query Builder ---

export class QueryBuilder<T = Record<string, unknown>> {
  private store: MemoryStore<T>;
  private schema: SchemaDefinition;
  private options: QueryOptions<T>;

  constructor(store: MemoryStore<T>, schema: SchemaDefinition) {
    this.store = store;
    this.schema = schema;
    this.options = {};
  }

  /** Add filter conditions */
  where(condition: FilterCondition<T>): QueryBuilder<T> {
    this.options.where = { ...this.options.where, ...condition };
    return this;
  }

  /** Add ordering */
  orderBy(field: keyof T, direction: "asc" | "desc" = "asc"): QueryBuilder<T> {
    this.options.orderBy = [...(this.options.orderBy ?? []), { field, direction }];
    return this;
  }

  /** Limit results */
  limit(count: number): QueryBuilder<T> {
    this.options.limit = count;
    return this;
  }

  /** Skip results (offset) */
  skip(offset: number): QueryBuilder<T> {
    this.options.skip = offset;
    return this;
  }

  /** Select specific fields only */
  select(fields: (keyof T)[]): QueryBuilder<T> {
    this.options.select = fields;
    return this;
  }

  /** Include related data */
  include(relations: RelationInclude[]): QueryBuilder<T> {
    this.options.include = [...(this.options.include ?? []), ...relations];
    return this;
  }

  /** Execute query and return all matching records */
  async find(): Promise<ModelInstance<T>[]> {
    let results = this.store.findAll();

    // Apply soft delete filter
    if (this.schema.softDelete) {
      results = results.filter((r) => !r.deletedAt);
    }

    // Apply filters
    if (this.options.where) {
      results = this.applyFilters(results, this.options.where);
    }

    // Apply sorting
    if (this.options.orderBy?.length) {
      results = this.applySorting(results, this.options.orderBy);
    }

    // Apply skip
    if (this.options.skip) {
      results = results.slice(this.options.skip);
    }

    // Apply limit
    if (this.options.limit) {
      results = results.slice(0, this.options.limit);
    }

    // Apply select projection
    if (this.options.select?.length) {
      results = results.map((r) => {
        const projected = { id: r.id, data: {} as T, createdAt: r.createdAt, updatedAt: r.updatedAt };
        for (const key of this.options.select!) {
          if (key in r.data) {
            (projected.data as Record<string, unknown>)[key as string] = (r.data as Record<string, unknown>)[key as string];
          }
        }
        return projected as ModelInstance<T>;
      });
    }

    return results;
  }

  /** Execute query and return first matching record */
  async first(): Promise<ModelInstance<T> | null> {
    const results = await this.limit(1).find();
    return results[0] ?? null;
  }

  /** Count matching records without fetching them */
  async count(): Promise<number> {
    let results = this.store.findAll();

    if (this.schema.softDelete) {
      results = results.filter((r) => !r.deletedAt);
    }

    if (this.options.where) {
      results = this.applyFilters(results, this.options.where);
    }

    return results.length;
  }

  /** Check if any record matches */
  async exists(): Promise<boolean> {
    return (await this.count()) > 0;
  }

  /** Execute and return paginated result */
  async paginate(page: number, pageSize: number): Promise<{
    data: ModelInstance<T>[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const total = await this.count();
    const totalPages = Math.ceil(total / pageSize);
    const safePage = Math.min(Math.max(1, page), totalPages || 1);

    const data = await this
      .skip((safePage - 1) * pageSize)
      .limit(pageSize)
      .find();

    return { data, total, page: safePage, pageSize, totalPages };
  }

  private applyFilters(records: ModelInstance<T>[], conditions: FilterCondition<T>): ModelInstance<T>[] {
    return records.filter((record) => {
      for (const [field, condition] of Object.entries(conditions)) {
        const value = (record.data as Record<string, unknown>)[field];

        if (typeof condition === "object" && condition !== null) {
          const op = condition as Record<string, unknown>;
          if ("eq" in op && value !== op.eq) return false;
          if ("neq" in op && value === op.neq) return false;
          if ("gt" in op && (value as number) <= (op.gt as number)) return false;
          if ("gte" in op && (value as number) < (op.gte as number)) return false;
          if ("lt" in op && (value as number) >= (op.lt as number)) return false;
          if ("lte" in op && (value as number) > (op.lte as number)) return false;
          if ("in" in op && !(op.in as unknown[]).includes(value)) return false;
          if ("nin" in op && (op.nin as unknown[]).includes(value)) return false;
          if ("like" in op && typeof value === "string" && !new RegExp(op.like as string, "i").test(value)) return false;
          if ("notLike" in op && typeof value === "string" && new RegExp(op.notLike as string, "i").test(value)) return false;
          if ("exists" in op) {
            if (op.exists && (value === undefined || value === null)) return false;
            if (!op.exists && value !== undefined && value !== null) return false;
          }
          if ("between" in op) {
            const [lo, hi] = op.between as [unknown, unknown];
            if ((value as number) < (lo as number) || (value as number) > (hi as number)) return false;
          }
          if ("contains" in op && Array.isArray(value)) {
            if (!value.includes(op.contains)) return false;
          }
        } else {
          if (value !== condition) return false;
        }
      }
      return true;
    });
  }

  private applySorting(records: ModelInstance<T>[], orderBys: OrderByClause<T>[]): ModelInstance<T>[] {
    return [...records].sort((a, b) => {
      for (const { field, direction } of orderBys) {
        const aVal = (a.data as Record<string, unknown>)[field as string];
        const bVal = (b.data as Record<string, unknown>)[field as string];

        let cmp = 0;
        if (aVal == null && bVal == null) cmp = 0;
        else if (aVal == null) cmp = -1;
        else if (bVal == null) cmp = 1;
        else if (typeof aVal === "number" && typeof bVal === "number") cmp = aVal - bVal;
        else cmp = String(aVal).localeCompare(String(bVal));

        if (cmp !== 0) return direction === "desc" ? -cmp : cmp;
      }
      return 0;
    });
  }
}

// --- Model Definition ---

export class Model<T = Record<string, unknown>> {
  readonly name: string;
  readonly schema: SchemaDefinition;
  private store: MemoryStore<T>;
  private relations: Map<string, { model: Model; foreignKey: string; type: "hasOne" | "hasMany" | "belongsTo" }> = new Map();

  constructor(schema: SchemaDefinition) {
    this.schema = schema;
    this.name = schema.tableName;
    this.store = new MemoryStore<T>();
  }

  /** Create a new query builder for this model */
  query(): QueryBuilder<T> {
    return new QueryBuilder(this.store, this.schema);
  }

  /** Create a new record */
  async create(data: T): Promise<ModelInstance<T>> {
    // Validate
    const errors = this.validate(data);
    if (errors.length > 0) throw new Error(`Validation failed: ${errors.join("; ")}`);

    // Apply defaults
    const processedData = { ...data };
    for (const field of this.schema.fields) {
      if (processedData[field.name as keyof T] === undefined && field.defaultValue !== undefined) {
        (processedData as Record<string, unknown>)[field.name] =
          typeof field.defaultValue === "function"
            ? (field.defaultValue as () => unknown)()
            : field.defaultValue;
      }
    }

    return this.store.insert(processedData);
  }

  /** Create multiple records in batch */
  async createMany(items: T[]): Promise<ModelInstance<T>[]> {
    return Promise.all(items.map((item) => this.create(item)));
  }

  /** Find by ID */
  async findById(id: string): Promise<ModelInstance<T> | null> {
    return this.store.find(id);
  }

  /** Find all records */
  async findAll(options?: Partial<QueryOptions<T>>): Promise<ModelInstance<T>[]> {
    const qb = this.query();
    if (options?.where) qb.where(options.where);
    if (options?.orderBy) options.orderBy.forEach((o) => qb.orderBy(o.field, o.direction));
    if (options?.limit) qb.limit(options.limit);
    if (options?.skip) qb.skip(options.skip);
    return qb.find();
  }

  /** Update a record by ID */
  async updateById(id: string, data: Partial<T>): Promise<ModelInstance<T> | null> {
    const instance = this.store.update(id, data);
    if (instance) {
      const errors = this.validate(instance.data as T);
      if (errors.length > 0) throw new Error(`Validation failed on update: ${errors.join("; ")}`);
    }
    return instance;
  }

  /** Delete a record by ID (soft delete if enabled) */
  async deleteById(id: string): Promise<boolean> {
    if (this.schema.softDelete) {
      const instance = this.store.find(id);
      if (instance) {
        instance.deletedAt = new Date();
        return true;
      }
      return false;
    }
    return this.store.delete(id);
  }

  /** Hard delete even with soft delete enabled */
  async hardDeleteById(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  /** Restore a soft-deleted record */
  async restore(id: string): Promise<boolean> {
    const instance = this.store.find(id);
    if (instance && instance.deletedAt) {
      delete instance.deletedAt;
      return true;
    }
    return false;
  }

  /** Get total count */
  async count(where?: FilterCondition<T>): Promise<number> {
    const qb = this.query();
    if (where) qb.where(where);
    return qb.count();
  }

  /** Validate data against schema */
  validate(data: T): string[] {
    const errors: string[] = [];
    for (const field of this.schema.fields) {
      const value = (data as Record<string, unknown>)[field.name];
      const error = validateFieldValue(value, field);
      if (error) errors.push(error);
    }
    return errors;
  }

  /** Define a relation to another model */
  hasOne<U>(relatedModel: Model<U>, foreignKey: string): Model<T> {
    this.relations.set(foreignKey, { model: relatedModel as Model<Record<string, unknown>>, foreignKey, type: "hasOne" });
    return this;
  }

  hasMany<U>(relatedModel: Model<U>, foreignKey: string): Model<T> {
    this.relations.set(foreignKey, { model: relatedModel as Model<Record<string, unknown>>, foreignKey, type: "hasMany" });
    return this;
  }

  belongsTo<U>(relatedModel: Model<U>, foreignKey: string): Model<T> {
    this.relations.set(foreignKey, { model: relatedModel as Model<Record<string, unknown>>, foreignKey, type: "belongsTo" });
    return this;
  }

  /** Clear all data from this model's store */
  clear(): void {
    this.store.clear();
  }

  /** Export all records as JSON */
  exportJSON(): string {
    return JSON.stringify(this.store.findAll());
  }

  /** Import records from JSON */
  importJSON(json: string): number {
    const records = JSON.parse(json) as ModelInstance<T>[];
    let imported = 0;
    for (const record of records) {
      this.store.insert(record.data);
      imported++;
    }
    return imported;
  }
}

// --- Database Manager ---

export class OrmLiteDB {
  private models: Map<string, Model> = new Map();

  /** Register a model with the database */
  register(schema: SchemaDefinition): Model {
    const model = new Model(schema);
    this.models.set(schema.tableName, model);
    return model;
  }

  /** Get a registered model by table name */
  getModel<T = Record<string, unknown>>(name: string): Model<T> | null {
    return (this.models.get(name) as Model<T>) ?? null;
  }

  /** List all registered model names */
  listModels(): string[] {
    return Array.from(this.models.keys());
  }

  /** Run a migration operation */
  migrate(operations: MigrationOperation[]): MigrationResult {
    const errors: string[] = [];
    const applied: MigrationOperation[] = [];

    for (const op of operations) {
      try {
        switch (op.type) {
          case "createTable": {
            if (!this.models.has(op.table)) {
              this.register({ tableName: op.table, fields: op.definition ? [op.definition] : [], timestamps: true });
              applied.push(op);
            }
            break;
          }
          case "dropTable": {
            const model = this.models.get(op.table);
            if (model) {
              model.clear();
              this.models.delete(op.table);
              applied.push(op);
            }
            break;
          }
          default:
            // No-op for in-memory store column/index operations
            applied.push(op);
            break;
        }
      } catch (err) {
        errors.push(`Migration error on ${op.type} ${op.table}: ${(err as Error).message}`);
      }
    }

    return { success: errors.length === 0, operations: applied, errors };
  }

  /** Drop all models and data */
  dropAll(): void {
    for (const [, model] of this.models) {
      model.clear();
    }
    this.models.clear();
  }

  /** Export entire database state */
  exportState(): Record<string, ModelInstance[]> {
    const state: Record<string, ModelInstance[]> = {};
    for (const [name, model] of this.models) {
      state[name] = model["store"] ? (model as unknown as { store: MemoryStore }).store.findAll() : [];
    }
    return state;
  }
}

/** Convenience: create a new database instance */
export function createDatabase(): OrmLiteDB {
  return new OrmLiteDB();
}
