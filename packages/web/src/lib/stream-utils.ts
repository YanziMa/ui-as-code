/**
 * Stream utilities — ReadableStream/WritableStream helpers,
 * transformations, backpressure, conversion utilities.
 */

// --- Types ---

export interface StreamOptions {
  /** High water mark for buffering */
  highWaterMark?: number;
  /** Size estimation function */
  size?: (chunk: unknown) => number;
}

export interface TransformOptions extends StreamOptions {
  /** Flush callback when stream ends */
  flush?: (controller: TransformStreamDefaultController) => void | Promise<void>;
}

// --- Creation Helpers ---

/**
 * Create a ReadableStream from an async iterable.
 */
export function readableFromAsync<T>(
  iterable: AsyncIterable<T>,
  options?: StreamOptions,
): ReadableStream<T> {
  return new ReadableStream<T>({
    async start(controller) {
      try {
        for await (const chunk of iterable) {
          if (controller.desiredSize === null || controller.desiredSize <= 0) {
            await waitForDesiredSize(controller, options?.highWaterMark ?? 1);
          }
          controller.enqueue(chunk);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

/**
 * Create a ReadableStream from an array/iterable.
 */
export function readableFromArray<T>(items: Iterable<T> | T[], options?: StreamOptions): ReadableStream<T> {
  return readableFromAsync(
    (async function* () { yield* items; })(),
    options,
  );
}

/**
 * Create a WritableStream that collects all chunks into an array.
 */
export function writableToArray<T>(): {
  stream: WritableStream<T>;
  getResult: () => Promise<T[]>;
} {
  const chunks: T[] = [];

  const stream = new WritableStream<T>({
    write(chunk) { chunks.push(chunk); },
  });

  return {
    stream,
    getResult: async () => {
      const writer = stream.getWriter();
      await writer.close();
      return chunks;
    },
  };
}

// --- Transformation Streams ---

/**
 * Create a TransformStream that maps each chunk.
 */
export function mapStream<I, O>(
  mapper: (chunk: I, index: number) => O | Promise<O>,
): TransformStream<I, O> {
  let index = 0;
  return new TransformStream<I, O>({
    async transform(chunk, controller) {
      controller.enqueue(await mapper(chunk as I, index++));
    },
  });
}

/**
 * Create a TransformStream that filters chunks.
 */
export function filterStream<T>(
  predicate: (chunk: T, index: number) => boolean | Promise<boolean>,
): TransformStream<T, T> {
  let index = 0;
  return new TransformStream<T, T>({
    async transform(chunk, controller) {
      if (await predicate(chunk as T, index++)) {
        controller.enqueue(chunk as T);
      }
    },
  });
}

/**
 * Create a TransformStream that batches chunks into arrays.
 */
export function batchStream<T>(
  size: number,
  options?: { flushPartial?: boolean },
): TransformStream<T, T[]> {
  let buffer: T[] = [];

  return new TransformStream<T, T[]>({
    transform(chunk, controller) {
      buffer.push(chunk as T);
      if (buffer.length >= size) {
        controller.enqueue([...buffer]);
        buffer = [];
      }
    },
    flush(controller) {
      if ((options?.flushPartial !== false) && buffer.length > 0) {
        controller.enqueue(buffer);
        buffer = [];
      }
    },
  });
}

/**
 * Create a TransformStream that flattens arrays of chunks.
 */
export function flattenStream<T>(): TransformStream<T[], T> {
  return new TransformStream<T[], T>({
    transform(chunk, controller) {
      for (const item of chunk as T[]) {
        controller.enqueue(item);
      }
    },
  });
}

/**
 * Create a TransformStream that adds a delay between chunks.
 */
export function throttleStream<T>(
  intervalMs: number,
): TransformStream<T, T> {
  let lastEmit = 0;

  return new TransformStream<T, T>({
    async transform(chunk, controller) {
      const now = Date.now();
      const wait = Math.max(0, intervalMs - (now - lastEmit));
      if (wait > 0) await sleep(wait);
      controller.enqueue(chunk as T);
      lastEmit = Date.now();
    },
  });
}

/**
 * Create a TransformStream that deduplicates consecutive identical chunks.
 */
export function dedupStream<T>(
  comparator?: (a: T, b: T) => boolean,
): TransformStream<T, T> {
  let lastValue: T | undefined;
  const eq = comparator ?? ((a: T, b: T) => a === b);

  return new TransformStream<T, T>({
    transform(chunk, controller) {
      const val = chunk as T;
      if (lastValue === undefined || !eq(lastValue, val)) {
        controller.enqueue(val);
        lastValue = val;
      }
    },
  });
}

/**
 * Create a pipe chain from multiple transforms.
 */
export function pipeThrough<T>(
  source: ReadableStream<T>,
  ...transforms: TransformStream<any, any>[]
): ReadableStream<any> {
  let current: ReadableStream<any> = source;
  for (const ts of transforms) {
    current = current.pipeThrough(ts);
  }
  return current;
}

// --- Conversion Utilities ---

/**
 * Consume a ReadableStream and collect all chunks.
 */
export async function consumeStream<T>(stream: ReadableStream<T>): Promise<T[]> {
  const reader = stream.getReader();
  const chunks: T[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value!);
  }

  return chunks;
}

/**
 * Convert a ReadableStream to an async iterable.
 */
export function streamToIterable<T>(stream: ReadableStream<T>): AsyncIterableIterator<T> {
  const reader = stream.getReader();

  return {
    [Symbol.asyncIterator]() { return this; },
    async next(): Promise<IteratorResult<T>> {
      const { done, value } = await reader.read();
      return done ? { done: true, value: undefined as unknown as T } : { done: false, value: value! };
    },
  };
}

/**
 * Convert an async iterable to a ReadableStream.
 */
export function iterableToStream<T>(iterable: AsyncIterable<T>): ReadableStream<T> {
  return readableFromAsync(iterable);
}

/**
 * Pipe a ReadableStream to a WritableStream and return a promise that resolves when done.
 */
export async function pipeToPromise<T>(
  source: ReadableStream<T>,
  destination: WritableStream<T>,
): Promise<void> {
  await source.pipeTo(destination);
}

/**
 * Tee a stream into N copies.
 */
export function teeStream<T>(stream: ReadableStream<T>, count: number = 2): ReadableStream<T>[] {
  if (count < 2) throw new Error("teeStream requires at least 2 copies");
  if (count === 2) return stream.tee();

  // For more than 2, recursively tee
  const [a, rest] = stream.tee();
  return [a, ...teeStream(rest, count - 1)];
}

// --- Text-Specific Utilities ---

/**
 * Create a ReadableStream from a string (chunks by lines or fixed size).
 */
export function textToStream(
  text: string,
  options?: { chunkSize?: number; delimiter?: string },
): ReadableStream<string> {
  const chunkSize = options?.chunkSize ?? 65536;
  const delimiter = options?.delimiter;

  if (delimiter) {
    return readableFromAsync(text.split(delimiter));
  }

  return readableFromAsync(
    (async function* () {
      for (let i = 0; i < text.length; i += chunkSize) {
        yield text.slice(i, i + chunkSize);
      }
    })(),
  );
}

/**
 * Collect a text stream into a single string.
 */
export async function collectText(stream: ReadableStream<string>): Promise<string> {
  const chunks = await consumeStream(stream);
  return chunks.join("");
}

// --- Binary Utilities ---

/**
 * Convert a ReadableStream<Uint8Array> to an ArrayBuffer.
 */
export async function streamToArrayBuffer(stream: ReadableStream<Uint8Array>): Promise<ArrayBuffer> {
  const resp = new Response(stream);
  return resp.arrayBuffer();
}

/**
 * Convert a ReadableStream<Uint8Array> to a Blob.
 */
export async function streamToBlob(
  stream: ReadableStream<Uint8Array>,
  type = "application/octet-stream",
): Promise<Blob> {
  const resp = new Response(stream);
  return resp.blob();
}

// --- Merge / Concat ---

/**
 * Merge multiple ReadableStreams into one (interleaved by arrival order).
 */
export function mergeStreams<T>(...streams: ReadableStream<T>[]): ReadableStream<T> {
  return new ReadableStream<T>(async (controller) => {
    const readers = streams.map((s) => s.getReader());
    let active = readers.length;

    const onNext = async (idx: number): Promise<void> => {
      try {
        while (true) {
          const { done, value } = await readers[idx].read();
          if (done) break;
          controller.enqueue(value!);
        }
      } catch (err) {
        controller.error(err);
      } finally {
        active--;
        if (active === 0) controller.close();
      }
    };

    await Promise.all(readers.map((_, i) => onNext(i)));
  });
}

/**
 * Concatenate multiple streams sequentially.
 */
export function concatStreams<T>(...streams: ReadableStream<T>[]): ReadableStream<T> {
  return readableFromAsync(
    (async function* () {
      for (const stream of streams) {
        yield* streamToIterable(stream);
      }
    })(),
  );
}

// --- Internal Helpers ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDesiredSize<T>(
  controller: ReadableStreamDefaultController<T>,
  minSize: number,
): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (controller.desiredSize !== null && controller.desiredSize >= minSize) {
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });
}
