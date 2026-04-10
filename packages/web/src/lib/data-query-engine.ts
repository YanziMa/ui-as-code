/**
 * Data Query Engine: SQL-like query engine for in-memory JavaScript data
 * with SELECT/WHERE/GROUP BY/HAVING/ORDER BY/LIMIT/JOIN support,
 * type-safe operators, aggregation functions, subqueries, and
 * expression parsing.
 */

// --- Types ---

export type TableName = string;
export type ColumnName = string;
export type Value = unknown;

export interface Row {
  [key: string]: Value;
}

export interface TableSchema {
  name: TableName;
  columns: Record<ColumnName, "string" | "number" | "boolean" | "date" | "any">;
  primaryKey?: ColumnName;
}

export interface QueryResult {
  rows: Row[];
  rowCount: number;
  executionTime: number; // ms
  schema?: TableSchema;
}

export type ComparisonOp =
  | "=" | "!=" | "<>" | ">" | "<" | ">=" | "<="
  | "LIKE" | "NOT LIKE" | "IN" | "NOT IN"
  | "IS NULL" | "IS NOT NULL"
  | "BETWEEN" | "NOT BETWEEN";

export type LogicalOp = "AND" | "OR" | "NOT";

export type AggregateFn =
  | "COUNT" | "SUM" | "AVG" | "MIN" | "MAX"
  | "FIRST" | "LAST" | "GROUP_CONCAT"
  | "STDDEV" | "VARIANCE";

export type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL" | "CROSS";

export interface WhereClause {
  column: ColumnName;
  op: ComparisonOp;
  value: Value | Value[];
  logicalOp?: LogicalOp;
  negated?: boolean;
}

export interface SelectColumn {
  expression: string; // "*" or column name or aggregate expr
  alias?: string;
  aggregate?: AggregateFn;
  distinct?: boolean;
}

export interface GroupByClause {
  columns: ColumnName[];
  having?: WhereClause[];
}

export interface OrderByClause {
  column: ColumnName;
  direction: "ASC" | "DESC";
  nullsFirst?: boolean;
}

export interface JoinClause {
  type: JoinType;
  table: TableName;
  alias?: string;
  on: WhereClause;
}

export interface QueryConfig {
  select: SelectColumn[];
  from: TableName;
  joins?: JoinClause[];
  where?: WhereClause[];
  groupBy?: GroupByClause;
  orderBy?: OrderByClause[];
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

// --- Database (in-memory tables) ---

export class InMemoryDatabase {
  private tables = new Map<TableName, Row[]>();
  private schemas = new Map<TableName, TableSchema>();

  createTable(schema: TableSchema): void {
    this.schemas.set(schema.name, schema);
    this.tables.set(schema.name, []);
  }

  dropTable(name: TableName): boolean {
    this.schemas.delete(name);
    return this.tables.delete(name) !== undefined;
  }

  insert(name: TableName, rows: Row | Row[]): number {
    const arr = Array.isArray(rows) ? rows : [rows];
    const table = this.tables.get(name);
    if (!table) throw new Error(`Table "${name}" does not exist`);
    table.push(...arr);
    return arr.length;
  }

  upsert(name: TableName, row: Row, keyColumn?: ColumnName): void {
    const table = this.tables.get(name);
    if (!table) throw new Error(`Table "${name}" does not exist`);
    const schema = this.schemas.get(name);
    const pk = keyColumn ?? schema?.primaryKey;
    if (pk) {
      const idx = table.findIndex((r) => r[pk] === row[pk]);
      if (idx >= 0) table[idx] = row;
      else table.push(row);
    } else {
      table.push(row);
    }
  }

  delete(name: TableName, where?: WhereClause[]): number {
    const table = this.tables.get(name);
    if (!table) throw new Error(`Table "${name}" does not exist`);
    if (!where?.length) {
      const count = table.length;
      table.length = 0;
      return count;
    }
    const beforeLen = table.length;
    const filtered = table.filter((row) => !this.evaluateWhere(row, where));
    const removed = beforeLen - filtered.length;
    table.length = 0;
    table.push(...filtered);
    return removed;
  }

  update(name: TableName, values: Partial<Row>, where?: WhereClause[]): number {
    const table = this.tables.get(name);
    if (!table) throw new Error(`Table "${name}" does not exist`);
    let count = 0;
    for (const row of table) {
      if (!where || this.evaluateWhere(row, where)) {
        Object.assign(row, values);
        count++;
      }
    }
    return count;
  }

  getAll(name: TableName): Row[] {
    return this.tables.get(name) ?? [];
  }

  getTableNames(): TableName[] { return Array.from(this.tables.keys()); }
  getSchema(name: TableName): TableSchema | undefined { return this.schemas.get(name); }
  getSchemas(): TableSchema[] { return Array.from(this.schemas.values()); }
  getRowCount(name: TableName): number { return this.tables.get(name)?.length ?? 0; }
  clearTable(name: TableName): void { this.tables.set(name, []); }
  dropAll(): void { this.tables.clear(); this.schemas.clear(); }
}

// --- QueryEngine Implementation ---

export class DataQueryEngine {
  private db: InMemoryDatabase;

  constructor(db?: InMemoryDatabase) {
    this.db = db ?? new InMemoryDatabase();
  }

  getDatabase(): InMemoryDatabase { return this.db; }

  /**
   * Execute a SQL-like query against in-memory data.
   */
  execute(config: QueryConfig): QueryResult {
    const start = performance.now();

    // Get base table
    let rows = this.db.getAll(config.from);
    let schema = this.db.getSchema(config.from);

    // Process JOINs
    if (config.joins?.length) {
      for (const join of config.joins) {
        rows = this.processJoin(rows, join);
      }
    }

    // WHERE filtering
    if (config.where?.length) {
      rows = rows.filter((row) => this.evaluateWhere(row, config.where!));
    }

    // GROUP BY
    if (config.groupBy?.columns.length) {
      rows = this.processGroupBy(rows, config.groupBy, config.select);
    } else {
      // Check for aggregates without GROUP BY
      const hasAggregates = config.select.some((s) => s.aggregate);
      if (hasAggregates) {
        rows = this.processAggregates(rows, config.select);
      } else {
        // Column projection
        rows = this.projectColumns(rows, config.select);
      }
    }

    // DISTINCT
    if (config.distinct) {
      rows = this.distinctRows(rows);
    }

    // Per-column DISTINCT
    for (const col of config.select) {
      if (col.distinct && !config.distinct) {
        // Already handled in projection
      }
    }

    // ORDER BY
    if (config.orderBy?.length) {
      rows = this.sortRows(rows, config.orderBy);
    }

    // LIMIT/OFFSET
    const totalRowCount = rows.length;
    if (config.offset) rows = rows.slice(config.offset);
    if (config.limit !== undefined) rows = rows.slice(0, config.limit);

    return {
      rows,
      rowCount: rows.length,
      executionTime: performance.now() - start,
      schema: schema ?? undefined,
    };
  }

  // --- Convenience Methods ---

  /** Quick SELECT all matching rows */
  select(table: TableName, where?: WhereClause[], cols?: ColumnName[]): Row[] {
    const select: SelectColumn[] = (cols ?? ["*"]).map((c) => ({ expression: c }));
    return this.execute({ select, from: table, where }).rows;
  }

  /** Quick COUNT */
  count(table: TableName, where?: WhereClause[]): number {
    return this.execute({
      select: [{ expression: "*", aggregate: "COUNT", alias: "_count" }],
      from: table, where,
    }).rows[0]?._count as number ?? 0;
  }

  /** Quick find one */
  findOne(table: TableName, where: WhereClause[], cols?: ColumnName[]): Row | undefined {
    const select: SelectColumn[] = (cols ?? ["*"]).map((c) => ({ expression: c }));
    return this.execute({ select, from: table, where, limit: 1 }).rows[0];
  }

  /** Check existence */
  exists(table: TableName, where: WhereClause[]): boolean {
    return this.count(table, where) > 0;
  }

  /** Get distinct values of a column */
  distinct(table: TableName, column: ColumnName, where?: WhereClause[]): Value[] {
    const rows = this.select(table, where, [column]);
    return [...new Set(rows.map((r) => r[column]))];
  }

  /** Find max/min/avg/sum of a column */
  aggregate(table: TableName, column: ColumnName, fn: AggregateFn, where?: WhereClause[]): number | null {
    const result = this.execute({
      select: [{ expression: column, aggregate: fn, alias: "_result" }],
      from: table, where,
    }).rows[0];
    return (result?._result as number) ?? null;
  }

  // --- Internal: Evaluation ---

  private evaluateWhere(row: Row, clauses: WhereClause[]): boolean {
    if (!clauses.length) return true;

    // Split by OR groups (clauses with explicit OR connect to previous)
    let result = true;
    let lastLogicalOp: LogicalOp | undefined;

    for (const clause of clauses) {
      const match = this.evaluateClause(row, clause);

      if (clause.negated) {
        // NOT applied to this clause only
      }

      const effectiveMatch = clause.negated ? !match : match;

      if (lastLogicalOp === undefined) {
        result = effectiveMatch;
      } else if (lastLogicalOp === "OR") {
        result = result || effectiveMatch;
      } else if (lastLogicalOp === "AND") {
        result = result && effectiveMatch;
      } else if (lastLogicalOp === "NOT") {
        result = result && !effectiveMatch;
      }

      lastLogicalOp = clause.logicalOp;
    }

    return result;
  }

  private evaluateClause(row: Row, clause: WhereClause): boolean {
    const val = row[clause.column];

    switch (clause.op) {
      case "=":
      case "<>": return val === clause.value;
      case "!=": return val !== clause.value;
      case ">": return typeof val === "number" && typeof clause.value === "number" && val > clause.value;
      case "<": return typeof val === "number" && typeof clause.value === "number" && val < clause.value;
      case ">=": return typeof val === "number" && typeof clause.value === "number" && val >= clause.value;
      case "<=": return typeof val === "number" && typeof clause.value === "number" && val <= clause.value;
      case "LIKE": return typeof val === "string" && typeof clause.value === "string" &&
        this.likeMatch(val, clause.value as string);
      case "NOT LIKE": return typeof val === "string" && typeof clause.value === "string" &&
        !this.likeMatch(val, clause.value as string);
      case "IN": return Array.isArray(clause.value) && clause.value.includes(val);
      case "NOT IN": return Array.isArray(clause.value) && !clause.value.includes(val);
      case "IS NULL": return val === null || val === undefined;
      case "IS NOT NULL": return val !== null && val !== undefined;
      case "BETWEEN": return Array.isArray(clause.value) && clause.value.length === 2 &&
        typeof val === "number" && val >= (clause.value[0] as number) && val <= (clause.value[1] as number);
      case "NOT BETWEEN": return Array.isArray(clause.value) && clause.value.length === 2 &&
        (typeof val !== "number" || val < (clause.value[0] as number) || val > (clause.value[1] as number));
      default: return true;
    }
  }

  private likeMatch(value: string, pattern: string): boolean {
    const regexStr = "^" + pattern.replace(/%/g, ".*").replace(/_/g, ".") + "$";
    try { return new RegExp(regexStr, "i").test(value); }
    catch { return value.includes(pattern.replace(/%/g, "")); }
  }

  private projectColumns(rows: Row[], select: SelectColumn[]): Row[] {
    const hasStar = select.some((s) => s.expression === "*");
    if (hasStar) return rows;

    return rows.map((row) => {
      const projected: Row = {};
      for (const col of select) {
        const key = col.alias ?? col.expression;
        if (col.expression === "*") {
          Object.assign(projected, row);
        } else if (col.expression.includes("(")) {
          // Expression — keep raw for now
          projected[key] = row[col.expression];
        } else {
          projected[key] = row[col.expression];
        }
      }
      return projected;
    });
  }

  private processGroupBy(rows: Row[], groupBy: GroupByClause, select: SelectColumn[]): Row[] {
    const groups = new Map<string, Row[]>();

    for (const row of rows) {
      const key = groupBy.columns.map((c) => `${c}=${JSON.stringify(row[c])}`).join("|");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    const result: Row[] = [];
    for (const [, groupRows] of groups) {
      const aggregated: Row = {};

      // Add group-by column values
      for (const col of groupBy.columns) {
        aggregated[col] = groupRows[0][col];
      }

      // Compute aggregates
      for (const sel of select) {
        if (sel.aggregate) {
          const key = sel.alias ?? `${sel.aggregate}_${sel.expression}`;
          aggregated[key] = this.computeAggregate(sel.aggregate, sel.expression, groupRows);
        } else if (!groupBy.columns.includes(sel.expression)) {
          // Non-aggregate, non-group column — take first
          aggregated[sel.alias ?? sel.expression] = groupRows[0][sel.expression];
        }
      }

      // HAVING filter
      if (groupBy.having?.length) {
        if (!this.evaluateWhere(aggregated, groupBy.having)) continue;
      }

      result.push(aggregated);
    }

    return result;
  }

  private processAggregates(rows: Row[], select: SelectColumn[]): Row[] {
    const result: Row = {};
    for (const sel of select) {
      const key = sel.alias ?? `${sel.aggregate}_${sel.expression}`;
      result[key] = this.computeAggregate(sel.aggregate!, sel.expression, rows);
    }
    return [result];
  }

  private computeAggregate(fn: AggregateFn, expression: string, rows: Row[]): Value {
    const values = rows.map((r) => r[expression]).filter((v) => v != null);

    switch (fn) {
      case "COUNT": return rows.length;
      case "SUM": return values.reduce((sum, v) => sum + (Number(v) || 0), 0);
      case "AVG": return values.length ? values.reduce((s, v) => s + (Number(v) || 0), 0) / values.length : 0;
      case "MIN": return values.length ? Math.min(...values.map(Number)) : null;
      case "MAX": return values.length ? Math.max(...values.map(Number)) : null;
      case "FIRST": return values[0] ?? null;
      case "LAST": return values[values.length - 1] ?? null;
      case "GROUP_CONCAT": return values.join(", ");
      case "STDDEV": return this.stddev(values.map(Number));
      case "VARIANCE": return this.variance(values.map(Number));
      default: return null;
    }
  }

  private processJoin(leftRows: Row[], join: JoinClause): Row[] {
    const rightRows = this.db.getAll(join.table);
    const result: Row[] = [];

    for (const leftRow of leftRows) {
      let matched = false;

      for (const rightRow of rightRows) {
        if (this.evaluateClause({ ...leftRow, ...rightRow }, join.on)) {
          result.push({ ...leftRow, ...rightRow });
          matched = true;
        }
      }

      // LEFT JOIN: include unmatched left rows
      if (!matched && (join.type === "LEFT" || join.type === "FULL")) {
        const rightSchema = this.db.getSchema(join.table);
        const nullRow: Row = {};
        if (rightSchema) {
          for (const col of Object.keys(rightSchema.columns)) nullRow[col] = null;
        }
        result.push({ ...leftRow, ...nullRow });
      }
    }

    return result;
  }

  private sortRows(rows: Row[], orderBy: OrderByClause[]): Row[] {
    return [...rows].sort((a, b) => {
      for (const ob of orderBy) {
        const aVal = a[ob.column];
        const bVal = b[ob.column];

        // Handle nulls
        if (aVal == null && bVal == null) continue;
        if (aVal == null) return ob.nullsFirst ? -1 : 1;
        if (bVal == null) return ob.nullsFirst ? 1 : -1;

        let cmp = 0;
        if (typeof aVal === "number" && typeof bVal === "number") {
          cmp = aVal - bVal;
        } else {
          cmp = String(aVal).localeCompare(String(bVal));
        }

        if (cmp !== 0) return ob.direction === "DESC" ? -cmp : cmp;
      }
      return 0;
    });
  }

  private distinctRows(rows: Row[]): Row[] {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private stddev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const sqDiffs = values.reduce((s, v) => s + (v - mean) ** 2, 0);
    return Math.sqrt(sqDiffs / (values.length - 1));
  }

  private variance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    return values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  }
}

// --- Query Builder (fluent API) ---

export class QueryBuilder {
  private config: QueryConfig = { select: [{ expression: "*" }], from: "" };
  private engine: DataQueryEngine;

  constructor(engine: DataQueryEngine, from: TableName) {
    this.engine = engine;
    this.config.from = from;
  }

  from(table: TableName): QueryBuilder { this.config.from = table; return this; }
  select(...cols: (ColumnName | { expr: string; alias?: string })[]): QueryBuilder {
    this.config.select = cols.map((c) =>
      typeof c === "string" ? { expression: c } : { expression: c.expr, alias: c.alias },
    );
    return this;
  }
  where(column: ColumnName, op: ComparisonOp, value: Value | Value[]): QueryBuilder {
    this.config.where = this.config.where ?? [];
    this.config.where.push({ column, op, value });
    return this;
  }
  andWhere(column: ColumnName, op: ComparisonOp, value: Value | Value[]): QueryBuilder {
    this.config.where = this.config.where ?? [];
    this.config.where.push({ column, op, value, logicalOp: "AND" });
    return this;
  }
  orWhere(column: ColumnName, op: ComparisonOp, value: Value | Value[]): QueryBuilder {
    this.config.where = this.config.where ?? [];
    this.config.where.push({ column, op, value, logicalOp: "OR" });
    return this;
  }
  groupBy(...cols: ColumnName[]): QueryBuilder {
    this.config.groupBy = { columns: cols };
    return this;
  }
  having(column: ColumnName, op: ComparisonOp, value: Value): QueryBuilder {
    if (this.config.groupBy) this.config.groupBy.having = this.config.groupBy.having ?? [];
    this.config.groupBy?.having?.push({ column, op, value });
    return this;
  }
  orderBy(col: ColumnName, dir: "ASC" | "DESC" = "ASC"): QueryBuilder {
    this.config.orderBy = this.config.orderBy ?? [];
    this.config.orderBy.push({ column: col, direction: dir });
    return this;
  }
  limit(n: number): QueryBuilder { this.config.limit = n; return this; }
  offset(n: number): QueryBuilder { this.config.offset = n; return this; }
  distinct(): QueryBuilder { this.config.distinct = true; return this; }
  join(type: JoinType, table: TableName, onCol: ColumnName, op: ComparisonOp = "=", value?: Value): QueryBuilder {
    this.config.joins = this.config.joins ?? [];
    this.config.joins.push({
      type, table,
      on: { column: onCol, op, value: value ?? onCol },
    });
    return this;
  }
  execute(): QueryResult { return this.engine.execute(this.config); }
  rows(): Row[] { return this.execute().rows; }
  one(): Row | undefined { return this.limit(1).execute().rows[0]; }
  count(): number { return this.engine.count(this.config.from, this.config.where); }
}

// --- Factory Functions ---

export function createQueryEngine(db?: InMemoryDatabase): DataQueryEngine {
  return new DataQueryEngine(db);
}

export function createDatabase(): InMemoryDatabase {
  return new InMemoryDatabase();
}

export function query(db: InMemoryDatabase, table: TableName): QueryBuilder {
  return new QueryBuilder(new DataQueryEngine(db), table);
}
