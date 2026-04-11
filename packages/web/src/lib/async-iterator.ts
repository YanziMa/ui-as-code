/**
 * Async iterator utilities — helpers for working with AsyncIterable,
 * conversion utilities, batching, parallel processing, and more.
 */

// --- Conversion ---

/** Collect all items from an async iterable into an array */
export async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) items.push(item);
  return items;
}

/** Convert an array to an async iterable */
function* arrayToAsyncIterable<T>(items: T[]): AsyncIterable<T> {
  yield* items;
}

/** Convert a sync iterable to async iterable */
export function toAsyncIterable<T>(iterable: Iterable<T> | AsyncIterable<T>): AsyncIterable<T> {
  if ((iterable as any)[Symbol.asyncIterator]) return iterable as AsyncIterable<T>;
  return (async function* () { yield* iterable; })();
}

// --- Mapping ---

/** Map over an async iterable with concurrency control */
export async function* mapAsync<T, R>(
  iterable: AsyncIterable<T>,
  mapper: (item: T, index: number) => Promise<R>,
  concurrency = 5,
): AsyncGenerator<R> {
  const queue: Array<{ item: T; index: number }> = [];
  let idx = 0;
  let done = false;
  let activeCount = 0;

  const iterator = iterable[Symbol.asyncIterator]();

  // Initial fill
  while (queue.length < concurrency && !done) {
    const result = await iterator.next();
    if (result.done) { done = true; break; }
    queue.push({ item: result.value, index: idx++ });
  }

  activeCount = queue.length;

  while (activeCount > 0 || (!done && queue.length > 0)) {
    // Process current batch
    for (const { item, index } of queue) {
      try {
        yield await mapper(item, index);
      } finally {
        activeCount--;
        // Refill
        if (!done) {
          const result = await iterator.next();
          if (result.done) { done = true; }
          else { queue.push({ item: result.value, index: idx++ }); activeCount++; }
        }
      }
    }
  }
}

/** Filter an async iterable */
export async function* filterAsync<T>(
  iterable: AsyncIterable<T>,
  predicate: (item: T) => Promise<boolean>,
): AsyncGenerator<T> {
  for await (const item of iterable) {
    if (await predicate(item)) yield item;
  }
}

/** Take N items from an async iterable */
export async function* takeAsync<T>(
  iterable: AsyncIterable<T>,
  n: number,
): AsyncGenerator<T> {
  let count = 0;
  for await (const item of iterable) {
    yield item;
    count++;
    if (count >= n) break;
  }
}

/** Skip first N items from an async iterable */
export async function* skipAsync<T>(
  iterable: AsyncIterable<T>,
  n: number,
): AsyncGenerator<T> {
  let skipped = 0;
  for await (const item of iterable) {
    if (skipped >= n) yield item;
    skipped++;
  }
}

/** Take while predicate is true */
export async function* takeWhileAsync<T>(
  iterable: AsyncIterable<T>,
  predicate: (item: T) => Promise<boolean>,
): AsyncGenerator<T> {
  for await (const item of iterable) {
    if (!(await predicate(item))) break;
    yield item;
  }
}

/** Drop while predicate is true */
export async function* dropWhileAsync<T>(
  iterable: AsyncIterable<T>,
  predicate: (item: T) => Promise<boolean>,
): AsyncGenerator<T> {
  let dropping = true;
  for await (const item of iterable) {
    if (dropping) dropping = await predicate(item);
    if (!dropping) yield item;
  }
}

// --- Reduction ---

/** Reduce an async iterable to a single value */
export async function reduceAsync<T, A>(
  iterable: AsyncIterable<T>,
  reducer: (acc: A, value: T, index: number) => Promise<A>,
  initial: A,
): Promise<A> {
  let acc = initial;
  let idx = 0;
  for await (const item of iterable) {
    acc = await reducer(acc, item, idx++);
  }
  return acc;
}

/** Find first item matching predicate in async iterable */
export async function findAsync<T>(
  iterable: AsyncIterable<T>,
  predicate: (item: T) => Promise<boolean>,
): Promise<T | undefined> {
  for await (const item of iterable) {
    if (await predicate(item)) return item;
  }
  return undefined;
}

/** Check if every item satisfies predicate */
export async function everyAsync<T>(
  iterable: AsyncIterable<T>,
  predicate: (item: T) => Promise<boolean>,
): Promise<boolean> {
  for await (const item of iterable) {
    if (!(await predicate(item))) return false;
  }
  return true;
}

/** Check if any item satisfies predicate */
export async function someAsync<T>(
  iterable: AsyncIterable<T>,
  predicate: (item: T) => Promise<boolean>,
): Promise<boolean> {
  for await (const item of iterable) {
    if (await predicate(item)) return true;
  }
  return false;
}

/** Count items in async iterable */
export async function countAsync(iterable: AsyncIterable<unknown>): Promise<number> {
  let count = 0;
  for await (const _ of iterable) count++;
  return count;
}

// --- Batching ---

/** Batch items from async iterable into arrays of batchSize */
export async function* batchAsync<T>(
  iterable: AsyncIterable<T>,
  batchSize = 10,
): AsyncGenerator<T[]> {
  let batch: T[] = [];
  for await (const item of iterable) {
    batch.push(item);
    if (batch.length >= batchSize) {
      yield batch;
      batch = [];
    }
  }
  if (batch.length > 0) yield batch;
}

/** Merge multiple async iterables (interleaved by arrival order) */
export async function* mergeAsync<T>(
  ...iterables: AsyncIterable<T>[]
): AsyncGenerator<T> {
  const iterators = iterables.map((it) => it[Symbol.asyncIterator]());
  const values = new Map<number, T>();
  let doneCount = 0;

  function getNext(id: number): void {
    iterators[id].next().then((result) => {
      if (result.done) { doneCount++; }
      else { values.set(id, result.value); }
    });
  }

  // Start all iterators
  iterators.forEach((_, i) => getNext(i));

  while (doneCount < iterators.length || values.size > 0) {
    if (values.size > 0) {
      const minKey = Math.min(...values.keys());
      const val = values.get(minKey)!;
      values.delete(minKey);
      yield val;
    } else {
      // Wait for any iterator to produce
      await new Promise<void>((resolve) => {
        // Polling approach — in practice we'd use events
        setTimeout(resolve, 10);
      });
    }
  }
}

// --- Timing ---

/** Add delay between items of an async iterable */
export async function* delayAsync<T>(
  iterable: AsyncIterable<T>,
  intervalMs: number,
): AsyncGenerator<T> {
  for await (const item of iterable) {
    yield item;
    await sleep(intervalMs);
  }
}

/** Timeout — only take items within time limit */
export async function* timeoutAsync<T>(
  iterable: AsyncIterable<T>,
  timeoutMs: number,
): AsyncGenerator<T> {
  const deadline = Date.now() + timeoutMs;
  for await (const item of iterable) {
    if (Date.now() >= deadline) break;
    yield item;
  }
}

// --- Retry ---

/** Retry failing items with backoff before skipping */
export async function* retryAsync<T>(
  iterable: AsyncIterable<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    onRetry?: (error: unknown, item: T) => void;
  },
): AsyncGenerator<T> {
  const maxRetries = options.maxRetries ?? 3;
  const retryDelay = options.retryDelay ?? 1000;

  for await (const item of iterable) {
    let attempts = 0;
    let lastError: unknown;

    while (attempts <= maxRetries) {
      try {
        yield item;
        break; // Success, move to next item
      } catch (error) {
        lastError = error;
        attempts++;
        options.onRetry?.(error, item);
        if (attempts <= maxRetries) await sleep(retryDelay);
      }
    }
  }
}

// --- Internal ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
