/**
 * Testing Utilities: Assertion library, test runner, mock/spy utilities,
 * fixture management, snapshot comparison, and test doubles.
 */

// --- Types ---

export type TestFn = () => void | Promise<void>;

export interface TestCase {
  name: string;
  fn: TestFn;
  skip?: boolean;
  only?: boolean;
  timeout?: number;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
  beforeEach?: () => void | Promise<void>;
  afterEach?: () => void | Promise<void>;
  beforeAll?: () => void | Promise<void>;
  afterAll?: () => void | Promise<void>;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: Error;
  duration: number;
}

export interface SuiteResult {
  name: string;
  results: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

export interface AssertionContext {
  actual: unknown;
  operator: string;
  expected: unknown;
  message?: string;
  passed: boolean;
}

// --- Assertion Library ---

/** Custom error for assertion failures */
export class AssertionError extends Error {
  constructor(public context: AssertionContext) {
    super(context.message ?? `Assertion failed: ${context.operator}`);
    this.name = "AssertionError";
  }
}

export class Assert {
  constructor(private actual: unknown) {}

  private fail(operator: string, expected: unknown, message?: string): never {
    throw new AssertionError({
      actual: this.actual,
      operator,
      expected,
      message,
      passed: false,
    });
  }

  private pass(): true { return true; }

  /** Strict equality */
  isEqual(expected: unknown, message?: string): boolean {
    if (this.actual !== expected) this.fail("===", expected, message);
    return this.pass();
  }

  isNotEqual(expected: unknown, message?: string): boolean {
    if (this.actual === expected) this.fail("!==", expected, message);
    return this.pass();
  }

  /** Deep equality */
  isDeepEqual(expected: unknown, message?: string): boolean {
    if (!deepEqual(this.actual, expected)) this.fail("deep ===", expected, message);
    return this.pass();
  }

  isNotDeepEqual(expected: unknown, message?: string): boolean {
    if (deepEqual(this.actual, expected)) this.fail("deep !==", expected, message);
    return this.pass();
  }

  /** Type checks */
  isType(type: string, message?: string): boolean {
    const t = typeof this.actual;
    if (t !== type) this.fail(`typeof === "${type}"`, t, message);
    return this.pass();
  }

  isInstanceOf(constructor: Function, message?: string): boolean {
    if (!(this.actual instanceof constructor)) {
      this.fail("instanceof", constructor.name, message);
    }
    return this.pass();
  }

  isNull(message?: string): boolean { return this.actual === null ? this.pass() : this.fail("=== null", this.actual, message); }
  isNotNull(message?: string): boolean { return this.actual !== null ? this.pass() : this.fail("!== null", this.actual, message); }
  isUndefined(message?: string): boolean { return this.actual === undefined ? this.pass() : this.fail("=== undefined", this.actual, message); }
  isDefined(message?: string): boolean { return this.actual !== undefined ? this.pass() : this.fail("!== undefined", this.actual, message); }
  isTruthy(message?: string): boolean { return !!this.actual ? this.pass() : this.fail("truthy", "falsy", message); }
  isFalsy(message?: string): boolean { return !this.actual ? this.pass() : this.fail("falsy", "truthy", message); }

  // --- Value comparisons ---

  isGreaterThan(n: number, message?: string): boolean {
    if (typeof this.actual !== "number" || !(this.actual as number) > n) this.fail(">", n, message);
    return this.pass();
  }

  isLessThan(n: number, message?: string): boolean {
    if (typeof this.actual !== "number" || !(this.actual as number) < n) this.fail("<", n, message);
    return this.pass();
  }

  isGreaterThanOrEqual(n: number, message?: string): boolean {
    if (typeof this.actual !== "number" || !(this.actual as number) >= n) this.fail(">=", n, message);
    return this.pass();
  }

  isLessThanOrEqual(n: number, message?: string): boolean {
    if (typeof this.actual !== "number" || !(this.actual as number) <= n) this.fail("<=", n, message);
    return this.pass();
  }

  isInRange(min: number, max: number, message?: string): boolean {
    if (typeof this.actual !== "number" || (this.actual as number) < min || (this.actual as number) > max) {
      this.fail(`in [${min}, ${max}]`, this.actual, message);
    }
    return this.pass();
  }

  isCloseTo(expected: number, epsilon = 0.001, message?: string): boolean {
    if (typeof this.actual !== "number" || Math.abs((this.actual as number) - expected) > epsilon) {
      this.fail("~=", expected, message);
    }
    return this.pass();
  }

  // --- String/Array/Object checks ---

  includes(item: unknown, message?: string): boolean {
    if (!includesValue(this.actual, item)) this.fail("includes", item, message);
    return this.pass();
  }

  notIncludes(item: unknown, message?: string): boolean {
    if (includesValue(this.actual, item)) this.fail("!includes", item, message);
    return this.pass();
  }

  hasLength(length: number, message?: string): boolean {
    const len = getLength(this.actual);
    if (len !== length) this.fail(".length", length, message);
    return this.pass();
  }

  hasKey(key: string, message?: string): boolean {
    if (this.actual == null || typeof this.actual !== "object" || !(key in (this.actual as object))) {
      this.fail(`has key "${key}"`, undefined, message);
    }
    return this.pass();
  }

  isEmpty(message?: string): boolean {
    if (getLength(this.actual) !== 0) this.fail("empty", `length=${getLength(this.actual)}`, message);
    return this.pass();
  }

  isNotEmpty(message?: string): boolean {
    if (getLength(this.actual) === 0) this.fail("non-empty", "empty", message);
    return this.pass();
  }

  matches(regex: RegExp, message?: string): boolean {
    if (typeof this.actual !== "string" || !regex.test(this.actual)) this.fail("matches", regex.toString(), message);
    return this.pass();
  }

  isArray(message?: string): boolean { return Array.isArray(this.actual) ? this.pass() : this.fail("Array", Array.isArray(this.actual), message); }
  isObject(message?: string): boolean {
    const ok = typeof this.actual === "object" && this.actual !== null && !Array.isArray(this.actual);
    return ok ? this.pass() : this.fail("Object", typeof this.actual, message);
  }

  isFunction(message?: string): boolean { return typeof this.actual === "function" ? this.pass() : this.fail("Function", typeof this.actual, message); }

  // --- Async/Promise checks ---

  async resolves(message?: string): Promise<boolean> {
    try {
      await this.actual;
      return this.pass();
    } catch (e) {
      this.fail("resolves", e instanceof Error ? e.message : String(e), message);
      return false; // unreachable due to throw
    }
  }

  async rejects(expectedError?: RegExp | string, message?: string): Promise<boolean> {
    try {
      await this.actual;
      this.fail("rejects", "resolved instead", message);
      return false; // unreachable
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (expectedError) {
        const pattern = expectedError instanceof RegExp ? expectedError : new RegExp(String(expectedError));
        if (!pattern.test(errMsg)) this.fail("rejects with", expectedError, message);
        else return this.pass();
      }
      return this.pass();
    }
  }

  throws(expectedError?: RegExp | string, message?: string): boolean {
    if (typeof this.actual !== "function") this.fail("throws", "not a function", message);
    try {
      (this.actual as Function)();
      this.fail("throws", "no error thrown", message);
      return false;
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (expectedError) {
        const pattern = expectedError instanceof RegExp ? expectedError : new RegExp(String(expectedError));
        if (!pattern.test(errMsg)) this.fail("throws with", expectedError, message);
        else return this.pass();
      }
      return this.pass();
    }
  }
}

// --- Assert Factory ---

/** Create an assert wrapper around a value */
export function expect(actual: unknown): Assert {
  return new Assert(actual);
}

/** Run a callback and assert it doesn't throw */
export function doesNotThrow(fn: () => void, message?: string): boolean {
  try {
    fn();
    return true;
  } catch (e) {
    throw new AssertionError({ actual: undefined, operator: "does not throw", expected: undefined, message: message ?? String(e), passed: false });
  }
}

// --- Deep Equality ---

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a as object).sort();
    const keysB = Object.keys(b as object).sort();
    if (!deepEqual(keysA, keysB)) return false;
    return keysA.every((k) => deepEqual((a as Record<string, unknown>)[k!], (b as Record<string, unknown>)[k!]));
  }

  return false;
}

function includesValue(container: unknown, value: unknown): boolean {
  if (container == null) return false;
  if (typeof container === "string") return container.includes(String(value));
  if (Array.isArray(value)) return value.some((v) => includesValue(container, v));
  if (Array.isArray(container)) return container.some((item) => deepEqual(item, value));
  if (typeof container === "object") return Object.values(container as object).some((v) => deepEqual(v, value));
  return container === value;
}

function getLength(value: unknown): number {
  if (value == null) return 0;
  if (Array.isArray(value)) return value.length;
  if (typeof value === "string") return value.length;
  if (typeof value === "object") return Object.keys(value as object).length;
  return 0;
}

// --- Mock / Spy Utilities ---

export interface Spy<T extends (...args: any[]) = any> {
  (...args: Parameters<T>): ReturnType<T>;
  mock: jest.Mock<ReturnType<T>, Parameters<T>>;
  restore: () => void;
}

/** Create a spy on an object method */
export function spyOn<T extends object, K extends keyof T>(
  obj: T,
  method: K,
): Spy<T[K] extends Function ? T[K] : never> {
  const original = obj[method] as Function;
  const calls: Array<{ args: unknown[]; result: unknown }> = [];

  const spy = ((...args: unknown[]) => {
    let result: unknown;
    try {
      result = original.apply(obj, args);
    } catch (e) {
      calls.push({ args, result: e });
      throw e;
    }
    calls.push({ args, result });
    return result;
  }) as unknown as Spy<any>;

  spy.mock = {
    calls: calls.map((c) => c.args),
    results: calls.map((c) => c.result),
    callCount: () => calls.length,
    lastCall: () => calls[calls.length - 1],
    clear: () => { calls.length = 0; },
    reset: () => { calls.length = 0; },
  };

  spy.restore = () => { obj[method] = original; };

  return spy;
}

/** Create a simple mock function */
export function createMock<T extends (...args: any[]) = any>(
  impl?: T,
): Spy<T> {
  const calls: Array<{ args: unknown[]; result: unknown }> = [];

  const mockFn = ((...args: unknown[]) => {
    let result: unknown;
    if (impl) {
      try { result = (impl as Function)(...args); } catch (e) { result = e; }
    }
    calls.push({ args, result });
    return result;
  }) as unknown as Spy<T>;

  mockFn.mock = {
    calls: calls.map((c) => c.args),
    results: calls.map((c) => c.result),
    callCount: () => calls.length,
    lastCall: () => calls[calls.length - 1],
    clear: () => { calls.length = 0; },
    reset: () => { calls.length = 0; },
  };

  mockFn.restore = () => {};

  return mockFn;
}

// --- Simple Test Runner ---

/**
 * Minimal test runner with beforeEach/afterEach support.
 */
export class TestRunner {
  private suites: TestSuite[] = [];
  private results: SuiteResult[] = [];

  describe(name: string, fn: (t: { it: (name: string, test: TestFn) => void }) => void): void {
    const suite: TestSuite = { name, tests: [] };
    this.suites.push(suite);

    fn({
      it: (testName: string, test: TestFn) => {
        suite.tests.push({ name: testName, fn: test });
      },
    });
  }

  async run(filter?: RegExp): Promise<SuiteResult[]> {
    this.results = [];

    for (const suite of this.suites) {
      const suiteResult: SuiteResult = {
        name: suite.name,
        results: [],
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      };

      const suiteStart = performance.now();

      try { await suite.beforeAll?.(); } catch {}

      for (const test of suite.tests) {
        if (filter && !filter.test(test.name)) continue;

        if (test.skip) {
          suiteResult.skipped++;
          suiteResult.results.push({ name: test.name, passed: true, duration: 0, error: undefined });
          continue;
        }

        try { await suite.beforeEach?.(); } catch {}
        const start = performance.now();

        try {
          const timeout = test.timeout ?? 5000;
          const result = await Promise.race([
            test.fn(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Test timed out after ${timeout}ms`)), timeout)
            ),
          ]);
          suiteResult.passed++;
          suiteResult.results.push({ name: test.name, passed: true, duration: performance.now() - start });
        } catch (err) {
          suiteResult.failed++;
          suiteResult.results.push({
            name: test.name,
            passed: false,
            duration: performance.now() - start,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }

        try { await suite.afterEach?.(); } catch {}
      }

      try { await suite.afterAll?.(); } catch {}

      suiteResult.duration = performance.now() - suiteStart;
      this.results.push(suiteResult);
    }

    return this.results;
  }

  printResults(): void {
    let totalPassed = 0, totalFailed = 0, totalSkipped = 0;

    for (const sr of this.results) {
      console.log(`\n${sr.name}:`);
      for (const r of sr.results) {
        const icon = r.passed ? "\u2713" : r.error ? "\u2717" : "\u25CB";
        console.log(`  ${icon} ${r.name} (${Math.round(r.duration)}ms)${r.error ? ` — ${r.error.message}` : ""}`);
      }
      console.log(`  ${sr.passed} passed, ${sr.failed} failed, ${sr.skipped} skipped (${Math.round(sr.duration)}ms total)`);
      totalPassed += sr.passed;
      totalFailed += sr.failed;
      totalSkipped += sr.skipped;
    }

    console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped`);
  }
}

// --- Snapshot Testing ---

const SNAPSHOT_KEY = "__test_snapshots__";

/** Save a snapshot value */
export function saveSnapshot(name: string, value: unknown): void {
  try {
    const snapshots = loadSnapshots();
    snapshots[name] = JSON.stringify(value, null, 2);
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots));
  } catch {}
}

/** Compare against saved snapshot */
export function matchSnapshot(name: string, value: unknown): { matched: boolean; diff?: string } {
  try {
    const snapshots = loadSnapshots();
    const stored = snapshots[name];

    if (!stored) {
      saveSnapshot(name, value);
      return { matched: false, diff: "Snapshot created (first run)" };
    }

    const current = JSON.stringify(value, null, 2);
    if (current === stored) return { matched: true };

    // Simple line-by-line diff
    const storedLines = stored.split("\n");
    const currentLines = current.split("\n");
    const diffs: string[] = [];

    for (let i = 0; i < Math.max(storedLines.length, currentLines.length); i++) {
      const s = storedLines[i];
      const c = currentLines[i];
      if (s === c) continue;
      if (s && !c) diffs.push(`-  ${s}`);
      else if (!s && c) diffs.push(`+  ${c}`);
      else diffs.push(`-  ${s}\n+  ${c}`);
    }

    return { matched: false, diff: diffs.join("\n") };
  } catch {
    return { matched: false, diff: "Snapshot comparison failed" };
  }
}

/** Clear all snapshots */
export function clearSnapshots(): void {
  try { localStorage.removeItem(SNAPSHOT_KEY); } catch {}
}

function loadSnapshots(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
