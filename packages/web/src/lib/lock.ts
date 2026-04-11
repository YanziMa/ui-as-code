/**
 * Concurrency primitives: Mutex, Semaphore, ReadWriteLock, and SpinLock
 * for coordinating async operations in JavaScript.
 */

// --- Types ---

export interface LockOptions {
  /** Timeout in ms (0 = no timeout, default 5000) */
  timeout?: number;
  /** Called when acquisition times out */
  onTimeout?: () => void;
}

// --- Mutex ---

/**
 * Mutual exclusion lock — only one holder at a time.
 */
export class Mutex {
  private _locked = false;
  private queue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];
  private readonly timeout: number;

  constructor(options: LockOptions = {}) {
    this.timeout = options.timeout ?? 5000;
  }

  /** Acquire the lock. Returns a release function. */
  async acquire(): Promise<() => void> {
    if (!this._locked) {
      this._locked = true;
      return this.release.bind(this);
    }

    return new Promise((resolve, reject) => {
      const timer = this.timeout > 0
        ? setTimeout(() => {
            const idx = this.queue.findIndex((e) => e.resolve === resolve);
            if (idx !== -1) {
              this.queue.splice(idx, 1);
              reject(new Error("Mutex: acquisition timed out"));
              options?.onTimeout?.();
            }
          }, this.timeout)
        : undefined;

      const options = { onTimeout: options?.onTimeout };

      this.queue.push({
        resolve: () => {
          if (timer) clearTimeout(timer);
          resolve(this.release.bind(this));
        },
        reject,
      });
    });
  }

  /** Run a function while holding the lock */
  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /** Check if currently locked */
  get locked(): boolean {
    return this._locked;
  }

  private release(): void {
    this._locked = false;
    const next = this.queue.shift();
    if (next) {
      this._locked = true;
      next.resolve();
    }
  }
}

// --- Semaphore ---

/**
 * Counting semaphore — limits concurrent access to N holders.
 */
export class Semaphore {
  private available: number;
  private queue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];
  private readonly maxCount: number;
  private readonly timeout: number;

  constructor(count: number, options: LockOptions = {}) {
    this.maxCount = count;
    this.available = count;
    this.timeout = options.timeout ?? 5000;
  }

  /** Acquire one permit. Returns a release function. */
  async acquire(): Promise<() => void> {
    if (this.available > 0) {
      this.available--;
      return this.release.bind(this);
    }

    return new Promise((resolve, reject) => {
      const timer = this.timeout > 0
        ? setTimeout(() => {
            const idx = this.queue.findIndex((e) => e.resolve === resolve);
            if (idx !== -1) {
              this.queue.splice(idx, 1);
              reject(new Error("Semaphore: acquisition timed out"));
            }
          }, this.timeout)
        : undefined;

      this.queue.push({
        resolve: () => {
          if (timer) clearTimeout(timer);
          resolve(this.release.bind(this));
        },
        reject,
      });
    });
  }

  /** Run a function with one permit acquired */
  async runWithPermit<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /** Current number of available permits */
  get permits(): number {
    return this.available;
  }

  /** Total capacity of the semaphore */
  get capacity(): number {
    return this.maxCount;
  }

  /** Number of waiters in queue */
  get waiting(): number {
    return this.queue.length;
  }

  private release(): void {
    this.available++;
    const next = this.queue.shift();
    if (next) {
      this.available--;
      next.resolve();
    }
  }
}

// --- ReadWriteLock ---

/**
 * Read-write lock: multiple readers OR one writer at a time.
 * Writers have priority over readers (write-preference).
 */
export class ReadWriteLock {
  private readers = 0;
  private writing = false;
  private writeQueue: Array<() => void> = [];
  private readQueue: Array<() => void> = [];

  /** Acquire a read lock. Returns release function. */
  async acquireRead(): Promise<() => void> {
    if (!this.writing && this.writeQueue.length === 0) {
      this.readers++;
      return this.releaseRead.bind(this);
    }

    return new Promise((resolve) => {
      this.readQueue.push(() => {
        this.readers++;
        resolve(this.releaseRead.bind(this));
      });
    });
  }

  /** Acquire a write lock. Returns release function. */
  async acquireWrite(): Promise<() => void> {
    if (!this.writing && this.readers === 0) {
      this.writing = true;
      return this.releaseWrite.bind(this);
    }

    return new Promise((resolve) => {
      this.writeQueue.push(() => {
        this.writing = true;
        resolve(this.releaseWrite.bind(this));
      });
    });
  }

  /** Run a function with a read lock held */
  async runWithRead<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquireRead();
    try { return await fn(); } finally { release(); }
  }

  /** Run a function with a write lock held */
  async runWithWrite<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquireWrite();
    try { return await fn(); } finally { release(); }
  }

  get readerCount(): number { return this.readers; }
  get isWriting(): boolean { return this.writing; }

  private releaseRead(): void {
    this.readers--;
    if (this.readers === 0 && this.writeQueue.length > 0) {
      this.writeQueue.shift()!();
    }
  }

  private releaseWrite(): void {
    this.writing = false;
    // Drain all waiting writers first, then readers
    if (this.writeQueue.length > 0) {
      this.writeQueue.shift()!();
    } else {
      // Wake up all waiting readers
      while (this.readQueue.length > 0) {
        this.readQueue.shift()!();
      }
    }
  }
}

// --- SpinLock ---

/**
 * Simple spin-lock using polling for synchronous-style async coordination.
 * Uses exponential backoff between polls.
 */
export class SpinLock {
  private _locked = false;
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;

  constructor(options?: { maxAttempts?: number; baseDelayMs?: number }) {
    this.maxAttempts = options?.maxAttempts ?? 100;
    this.baseDelayMs = options?.baseDelayMs ?? 10;
  }

  /** Try to acquire the spin lock */
  async acquire(timeoutMs = 30000): Promise<boolean> {
    let attempts = 0;
    let delay = this.baseDelayMs;

    while (attempts < this.maxAttempts) {
      if (!this._locked) {
        this._locked = true;
        return true;
      }

      attempts++;
      await this.sleep(delay);
      delay = Math.min(delay * 2, 100); // Exponential backoff, cap at 100ms
    }

    return false;
  }

  /** Release the spin lock */
  release(): void {
    this._locked = false;
  }

  get locked(): boolean { return this._locked; }

  /** Run a function while holding the spin lock */
  async runLocked<T>(fn: () => Promise<T>, timeoutMs?: number): Promise<T | undefined> {
    const acquired = await this.acquire(timeoutMs);
    if (!acquired) return undefined;
    try { return await fn(); } finally { this.release(); }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
