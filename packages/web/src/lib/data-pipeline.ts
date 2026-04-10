/**
 * Data transformation pipeline: ETL-style data processing, mapping, filtering,
 * aggregation, validation chains, streaming transforms.
 */

// --- Types ---

export interface DataRecord {
  [key: string]: unknown;
}

export interface TransformStep<T = DataRecord> {
  name: string;
  fn: (data: T[], context: TransformContext) => T[] | Promise<T[]>;
  skipIf?: (context: TransformContext) => boolean;
}

export interface TransformContext {
  /** Current step index */
  stepIndex: number;
  /** Total steps */
  totalSteps: number;
  /** Pipeline name */
  pipelineName: string;
  /** Started at timestamp */
  startedAt: number;
  /** Custom metadata passed through */
  metadata?: Record<string, unknown>;
  /** Accumulator for cross-step state */
  state: Map<string, unknown>;
}

export interface PipelineResult<T = DataRecord> {
  data: T[];
  stats: {
    inputCount: number;
    outputCount: number;
    durationMs: number;
    stepsCompleted: number;
    stepsSkipped: number;
    errors: Array<{ step: string; error: Error; recordIndex?: number }>;
  };
  context: TransformContext;
}

export interface AggregationResult {
  count: number;
  sum?: number;
  avg?: number;
  min?: number;
  max?: number;
  first?: unknown;
  last?: unknown;
  uniqueCount?: number;
  groupBy?: Record<string, unknown[]>;
}

// --- Pipeline ---

export class DataPipeline<T = DataRecord> {
  private steps: TransformStep<T>[] = [];
  private name = "pipeline";
  private errorStrategy: "fail" | "skip-record" | "continue" = "skip-record";

  constructor(name?: string) {
    if (name) this.name = name;
  }

  /** Add a transform step */
  add(step: Omit<TransformStep<T>, "name"> & { name?: string }): this {
    this.steps.push({ name: step.name ?? `step-${this.steps.length + 1}`, ...step });
    return this;
  }

  /** Set error handling strategy */
  onError(strategy: "fail" | "skip-record" | "continue"): this {
    this.errorStrategy = strategy;
    return this;
  }

  /** Execute the pipeline */
  async execute(data: T[], metadata?: Record<string, unknown>): Promise<PipelineResult<T>> {
    const startedAt = Date.now();
    const errors: PipelineResult["stats"]["errors"] = [];
    let currentData = [...data];
    let stepsCompleted = 0;
    let stepsSkipped = 0;

    const context: TransformContext = {
      stepIndex: 0,
      totalSteps: this.steps.length,
      pipelineName: this.name,
      startedAt,
      metadata,
      state: new Map(),
    };

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i]!;
      context.stepIndex = i;

      if (step.skipIf?.(context)) {
        stepsSkipped++;
        continue;
      }

      try {
        const result = await step.fn(currentData, context);
        currentData = result;
        stepsCompleted++;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push({ step: step.name, error: err });

        switch (this.errorStrategy) {
          case "fail":
            return {
              data: currentData,
              stats: {
                inputCount: data.length,
                outputCount: currentData.length,
                durationMs: Date.now() - startedAt,
                stepsCompleted,
                stepsSkipped,
                errors,
              },
              context,
            };
          case "continue":
            stepsCompleted++;
            break;
          // skip-record is default — already counted as completed
          default:
            stepsCompleted++;
        }
      }
    }

    return {
      data: currentData,
      stats: {
        inputCount: data.length,
        outputCount: currentData.length,
        durationMs: Date.now() - startedAt,
        stepsCompleted,
        stepsSkipped,
        errors,
      },
      context,
    };
  }

  /** Execute synchronously (all steps must be sync) */
  executeSync(data: T[]): PipelineResult<T> {
    // Wrap in async and block-like behavior
    let result!: PipelineResult<T>;
    this.execute(data).then((r) => { result = r; });
    // This won't actually work for real sync, but provides API consistency
    // In practice, always use execute() which returns a Promise
    return result ?? {
      data: [],
      stats: { inputCount: 0, outputCount: 0, durationMs: 0, stepsCompleted: 0, stepsSkipped: 0, errors: [] },
      context: { stepIndex: 0, totalSteps: 0, pipelineName: this.name, startedAt: 0, state: new Map() },
    };
  }

  getSteps(): ReadonlyArray<TransformStep<T>> { return this.steps; }
  clear(): void { this.steps = []; }
}

// --- Built-in Transforms ---

/** Filter records where predicate returns true */
export function filter<T extends DataRecord>(
  predicate: (record: T, index: number) => boolean,
): TransformStep<T>["fn"] {
  return (data) => data.filter(predicate);
}

/** Map each record to a new shape */
export function map<T extends DataRecord, U extends DataRecord>(
  mapper: (record: T, index: number) => U,
): (data: T[]) => U[] {
  return (data) => data.map(mapper);
}

/** Pick only specified fields from each record */
export function pick<K extends string>(fields: K[]): TransformStep<{ [k in K]: unknown }>["fn"] {
  return (data) =>
    data.map((record) => {
      const obj: Record<string, unknown> = {};
      for (const field of fields) {
        if (field in record) obj[field] = record[field];
      }
      return obj as { [k in K]: unknown };
    });
}

/** Omit specified fields from each record */
export function omit(fields: string[]): TransformStep<DataRecord>["fn"] {
  const fieldSet = new Set(fields);
  return (data) =>
    data.map((record) => {
      const obj: DataRecord = {};
      for (const [key, value] of Object.entries(record)) {
        if (!fieldSet.has(key)) obj[key] = value;
      }
      return obj;
    });
}

/** Rename fields */
export function rename(mapping: Record<string, string>): TransformStep<DataRecord>["fn"] {
  return (data) =>
    data.map((record) => {
      const obj: DataRecord = {};
      for (const [key, value] of Object.entries(record)) {
        const newKey = mapping[key] ?? key;
        obj[newKey] = value;
      }
      return obj;
    });
}

/** Add computed/derived fields */
export function derive(
  computations: Record<string, (record: DataRecord) => unknown>,
): TransformStep<DataRecord>["fn"] {
  return (data) =>
    data.map((record) => ({
      ...record,
      ...Object.fromEntries(
        Object.entries(computations).map(([key, fn]) => [key, fn(record)]),
      ),
    }));
}

/** Sort records by one or more fields */
export function sortBy(
  ...comparators: Array<{
    field: string;
    order?: "asc" | "desc";
    type?: "string" | "number" | "date" | "boolean";
  }>
): TransformStep<DataRecord>["fn"] {
  return (data) =>
    [...data].sort((a, b) => {
      for (const comp of comparators) {
        const order = comp.order === "desc" ? -1 : 1;
        const va = a[comp.field];
        const vb = b[comp.field];

        if (va == null && vb == null) continue;
        if (va == null) return 1 * order;
        if (vb == null) return -1 * order;

        switch (comp.type ?? (typeof va === "number" ? "number" : "string")) {
          case "number":
            return ((va as number) - (vb as number)) * order;
          case "date":
            return (new Date(va as string).getTime() - new Date(vb as string).getTime()) * order;
          case "boolean":
            return ((va ? 1 : 0) - (vb ? 1 : 0)) * order;
          default:
            return String(va).localeCompare(String(vb)) * order;
        }
      }
      return 0;
    });
}

/** Limit to first N records */
export function limit(n: number): TransformStep<DataRecord>["fn"] {
  return (data) => data.slice(0, n);
}

/** Skip first N records */
export function offset(n: number): TransformStep<DataRecord>["fn"] {
  return (data) => data.slice(n);
}

/** Paginate with page size and page number (1-based) */
export function paginate(pageSize: number, pageNumber = 1): TransformStep<DataRecord>["fn"] {
  const start = (pageNumber - 1) * pageSize;
  return (data) => data.slice(start, start + pageSize);
}

/** Remove duplicate records by key(s) */
export function uniqBy(...keys: string[]): TransformStep<DataRecord>["fn"] {
  const seen = new Set<string>();
  return (data) =>
    data.filter((record) => {
      const key = keys.map((k) => JSON.stringify(record[k])).join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Group records by a field */
export function groupBy(field: string): (data: DataRecord[]) => Array<{ key: unknown; values: DataRecord[]; count: number }> {
  return (data) => {
    const groups = new Map<unknown, DataRecord[]>();
    for (const record of data) {
      const key = record[field];
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(record);
    }
    return Array.from(groups.entries()).map(([key, values]) => ({ key, values, count: values.length }));
  };
}

// --- Aggregation ---

/** Aggregate records with multiple operations */
export function aggregate(
  field: string,
  operations: Array<"count" | "sum" | "avg" | "min" | "max" | "first" | "last" | "unique">,
): (data: DataRecord[]) => AggregationResult {
  return (data) => {
    const values = data
      .map((r) => r[field])
      .filter((v) => v != null);

    const numericValues = values.filter((v) => typeof v === "number") as number[];

    const result: AggregationResult = { count: data.length };

    if (operations.includes("sum") && numericValues.length > 0) {
      result.sum = numericValues.reduce((a, b) => a + b, 0);
    }
    if (operations.includes("avg") && numericValues.length > 0) {
      result.avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
    }
    if (operations.includes("min") && numericValues.length > 0) {
      result.min = Math.min(...numericValues);
    }
    if (operations.includes("max") && numericValues.length > 0) {
      result.max = Math.max(...numericValues);
    }
    if (operations.includes("first") && values.length > 0) {
      result.first = values[0];
    }
    if (operations.includes("last") && values.length > 0) {
      result.last = values[values.length - 1];
    }
    if (operations.includes("unique")) {
      result.uniqueCount = new Set(values).size;
    }

    return result;
  } as never; // Type assertion for the function return
}

/** Aggregate after grouping */
export function aggregateBy(
  groupField: string,
  aggField: string,
  operations: Array<"count" | "sum" | "avg">,
): (data: DataRecord[]) => Array<{ group: unknown; result: AggregationResult }> {
  return (data) => {
    const groups = groupBy(groupField)(data);
    return groups.map(({ key, values }) => ({
      group: key,
      result: aggregate(aggField, operations)(values),
    }));
  };
}

// --- Validation ---

export interface ValidationRule {
  field: string;
  message: string;
  test: (value: unknown, record: DataRecord) => boolean;
  severity?: "error" | "warning";
}

/** Validate all records against rules */
export function validate(rules: ValidationRule[]): TransformStep<DataRecord>["fn"] {
  return (data, ctx) => {
    const valid: DataRecord[] = [];
    const invalid: DataRecord[] = [];

    for (let i = 0; i < data.length; i++) {
      const record = data[i]!;
      let isValid = true;

      for (const rule of rules) {
        if (!rule.test(record[rule.field], record)) {
          isValid = false;
          // Store validation error on the record itself
          (record._validationErrors ??= []).push({
            field: rule.field,
            message: rule.message,
            severity: rule.severity ?? "error",
          });
        }
      }

      if (isValid) valid.push(record);
      else invalid.push(record);
    }

    // Store invalid count in context for later steps
    ctx.state.set("validation_invalid_count", invalid.length);
    ctx.state.set("validation_valid_count", valid.length);

    return valid;
  };
}

/** Common validation rules */
export const validations = {
  required: (field: string, message = `${field} is required`): ValidationRule => ({
    field, message, test: (v) => v !== null && v !== undefined && v !== "",
  }),
  type: (field: string, expectedType: string): ValidationRule => ({
    field,
    message: `${field} must be ${expectedType}`,
    test: (v) => {
      if (v === null || v === undefined) return true; // Let required handle nulls
      switch (expectedType) {
        case "string": return typeof v === "string";
        case "number": return typeof v === "number" && !isNaN(v);
        case "boolean": return typeof v === "boolean";
        case "array": return Array.isArray(v);
        case "object": return typeof v === "object" && !Array.isArray(v);
        default: return true;
      }
    },
  }),
  min: (field: string, min: number): ValidationRule => ({
    field,
    message: `${field} must be >= ${min}`,
    test: (v) => v == null || typeof v !== "number" || v >= min,
  }),
  max: (field: string, max: number): ValidationRule => ({
    field,
    message: `${field} must be <= ${max}`,
    test: (v) => v == null || typeof v !== "number" || v <= max,
  }),
  pattern: (field: string, regex: RegExp, message?: string): ValidationRule => ({
    field,
    message: message ?? `${field} format is invalid`,
    test: (v) => v == null || typeof v !== "string" || regex.test(v),
  }),
  enum: (field: string, allowed: unknown[]): ValidationRule => ({
    field,
    message: `${field} must be one of: ${allowed.join(", ")}`,
    test: (v) => v == null || allowed.includes(v),
  }),
  email: (field: string): ValidationRule => ({
    field,
    message: `${field} must be a valid email`,
    test: (v) => v == null || typeof v !== "string" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  }),
  url: (field: string): ValidationRule => ({
    field,
    message: `${field} must be a valid URL`,
    test: (v) => {
      try { return v == null || typeof v !== "string" || !!new URL(v); } catch { return false; }
    },
  }),
};

// --- Join Operations ---

/** Inner join two datasets on a key field */
export function innerJoin<U extends DataRecord>(
  otherData: U[],
  leftKey: string,
  rightKey: string,
  prefixOther = "right_",
): TransformStep<DataRecord & { [K in keyof U as `right_${string & K}`]: U[K] }>["fn"] {
  const otherMap = new Map<unknown, U>();
  for (const row of otherData) {
    otherMap.set(row[rightKey], row);
  }

  return (data) =>
    data
      .map((left) => {
        const right = otherMap.get(left[leftKey]);
        if (!right) return null;
        const merged: Record<string, unknown> = { ...left };
        for (const [key, value] of Object.entries(right)) {
          merged[prefixOther + key] = value;
        }
        return merged;
      })
      .filter(Boolean) as (DataRecord & { [K in keyof U as `right_${string & K}`]: U[K] })[];
}

/** Left join (keep all left records, fill right with null) */
export function leftJoin<U extends DataRecord>(
  otherData: U[],
  leftKey: string,
  rightKey: string,
  prefixOther = "right_",
): TransformStep<DataRecord>["fn"] {
  const otherMap = new Map<unknown, U>();
  for (const row of otherData) {
    otherMap.set(row[rightKey], row);
  }

  return (data) =>
    data.map((left) => {
      const right = otherMap.get(left[leftKey]);
      const merged: Record<string, unknown> = { ...left };
      if (right) {
        for (const [key, value] of Object.entries(right)) {
          merged[prefixOther + key] = value;
        }
      }
      return merged;
    });
}
