/**
 * Scheduler v3: advanced task scheduling with priorities, dependencies, concurrency control,
 * retry/backoff strategies, rate limiting, cron-like scheduling, deadline management,
 * resource pooling, DAG-based task execution, worker threads, job queues.
 */

// --- Types ---

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "blocked" | "retrying" | "timeout";

export interface TaskResult<T = unknown> {
  status: "completed";
  value: T;
  duration: number;
}

export interface TaskError {
  status: "failed" | "timeout";
  error: Error;
  attempts: number;
  lastAttemptAt: number;
}

export interface ScheduleOptions {
  priority?: number;       // Higher = more important (default 0)
  weight?: number;         // For same-priority ordering
  delay?: number;           // Delay before first execution (ms)
  timeout?: number;          // Max execution time (ms)
  maxRetries?: number;      // Max retry attempts (default 3)
  retryDelay?: number;       // Base delay between retries (ms) (exponential backoff)
  retryBackoff?: "linear" | "exponential" | "jittered";
  dedupKey?: string;        // Deduplicate by key
  ttl?: number;             // Time-to-live for scheduled tasks (ms)
  tags?: string[];          // For filtering/grouping
  dependsOn?: string[];     // Task IDs that must complete first
  runAt?: Date;            // Specific run time
  interval?: number;        // Repeat interval (ms), 0 = no repeat
  maxConcurrent?: number;   // Concurrency limit for this task type
  resource?: string;        // Resource pool name
}

export interface Job<T = unknown> {
  id: string;
  fn: () => Promise<T>;
  options?: ScheduleOptions;
  status: TaskStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: T | Error;
  attempts: number;
  nextRun?: number;
  runCount: number;
}

export interface ResourcePoolConfig {
  name: string;
  size: number;
  acquireTimeout?: number;
  idleTimeout?: number;
}

// --- Scheduler Core ---

export class Scheduler {
  private jobs = new Map<string, Job<unknown>>();
  private queue: string[] = []; // Ordered job IDs
  private running = new Set<string>();
  private completed = new Set<string>();
  private failed = new Set<string>();
  private listeners = new Set<(job: Job<unknown>, event: string) => void>();
  private resourcePools = new Map<string, ResourcePool>();
  private concurrency = Infinity;
  private runningCount = 0;
  private _running = false;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options?: { concurrency?: number }) {
    this.concurrency = options?.concurrency ?? Infinity;
  }

  get isRunning(): boolean { return this._running; }
  get stats() {
    return {
      total: this.jobs.size,
      pending: this.queue.length,
      running: this.runningCount,
      completed: this.completed.size,
      failed: this.failed.size,
    };
  }

  /** Add a job to the scheduler */
  add<T>(id: string, fn: () => Promise<T>, options?: ScheduleOptions): string {
    if (this.jobs.has(id)) throw new Error(`Job ${id} already exists`);
    const job: Job<T> = {
      id, fn, options: options ?? {},
      status: "pending",
      createdAt: Date.now(), attempts: 0, runCount: 0,
    };
    this.jobs.set(id, job);
    this.requeue(id);
    return id;
  }

  /** Remove a job */
  remove(id: string): boolean {
    this.queue = this.queue.filter((jid) => jid !== id);
    this.running.delete(id);
    return this.jobs.delete(id);
  }

  /** Start processing the job queue */
  start(): void {
    if (this._running) return;
    this._running = true;
    this.tickInterval = setInterval(() => this.tick(), 100);
  }

  /** Stop processing */
  stop(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this._running = false;
  }

  /** Process one tick of the scheduler */
  async tick(): Promise<void> {
    // Check for timed jobs
    const now = Date.now();
    for (const [, job] of this.jobs) {
      if (job.options?.runAt && job.status === "pending" && job.options.runAt <= now) {
        this.requeue(job.id);
      }
      // Check TTL expiry
      if (job.options?.ttl && job.status === "pending" && (now - job.createdAt) > job.options.ttl) {
        this.remove(job.id); continue;
      }
    }

    // Check dependency-blocked jobs
    const blocked = new Set<string>();
    for (const [id, job] of this.jobs) {
      if (job.status !== "pending") continue;
      if (job.options?.dependsOn?.some((depId) => !this.completed.has(depId))) {
        blocked.add(id);
      }
    }

    // Pick next eligible job
    let jobId: string | undefined;
    while (this.queue.length > 0) {
      const candidate = this.queue.shift()!;
      const job = this.jobs.get(candidate)!;
      if (!job || job.status !== "pending" || blocked.has(candidate)) continue;
      if (this.runningCount >= this.concurrency) { this.queue.unshift(candidate); break; }
      jobId = candidate;
      break;
    }

    if (!jobId) return;

    const job = this.jobs.get(jobId)!;
    await this.executeJob(job);
  }

  private async executeJob(job: Job<unknown>): Promise<void> {
    job.status = "running";
    job.startedAt = Date.now();
    this.running.add(job.id);
    this.runningCount++;
    this.listeners.forEach((l) => l(job, "start"));

    try {
      // Acquire resource if needed
      let resource: unknown;
      if (job.options?.resource) {
        resource = await this.acquireResource(job.options.resource);
      }

      // Timeout wrapper
      const result = await (job.options?.timeout
        ? Promise.race([
            job.fn(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), job.options.timeout),
          ])
        : job.fn());

      job.status = "completed";
      job.result = result;
      job.completedAt = Date.now();
      this.listeners.forEach((l) => l(job, "complete"));
    } catch (err) {
      const maxRetries = job.options?.maxRetries ?? 3;
      job.attempts++;

      if (job.attempts < maxRetries && job.status !== "cancelled") {
        job.status = "retrying";
        const baseDelay = job.options?.retryDelay ?? 1000;
        let delay = baseDelay;
        switch (job.options?.retryBackoff) {
          case "exponential": delay = baseDelay * Math.pow(2, job.attempts - 1); break;
          case "jittered": delay = baseDelay + Math.random() * baseDelay * 0.5; break;
        }
        this.listeners.forEach((l) => l(job, "retry"));
        await new Promise((r) => setTimeout(r, delay));
        this.requeue(job.id);
      } else {
        job.status = "failed";
        job.result = err;
        this.failed.add(job.id);
        this.listeners.forEach((l) => l(job, "error"));
      }
    } finally {
      this.running.delete(job.id);
      this.runningCount--;
      if (job.options?.resource) this.releaseResource(job.options.resource);

      // Handle interval/repeat
      if (job.status === "completed" && job.options?.interval && job.options.interval > 0) {
        job.nextRun = Date.now() + job.options.interval;
        job.status = "pending";
        job.result = undefined;
        job.attempts = 0;
        job.runCount++;
        this.requeue(job.id);
      } else if (job.status === "completed" || job.status === "failed") {
        this.completed.add(job.id);
      }
    }
  }

  private requeue(id: string): void {
    if (!this.queue.includes(id)) {
      // Insert sorted by priority (higher priority first)
      const job = this.jobs.get(id)!;
      const priority = -(job.options?.priority ?? 0);
      const weight = -(job.options?.weight ?? 0);
      let inserted = false;
      for (let i = 0; i < this.queue.length; i++) {
        const other = this.jobs.get(this.queue[i]!)!;
        const otherPriority = -(other.options?.priority ?? 0);
        const otherWeight = -(other.options?.weight ?? 0);
        if (priority > otherPriority || (priority === otherPriority && weight >= otherWeight)) {
          this.queue.splice(i, 0, id);
          inserted = true;
          break;
        }
      }
      if (!inserted) this.queue.push(id);
    }
  }

  /** Listen to job lifecycle events */
  onEvent(listener: (job: Job<unknown>, event: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Resource Pools ---

  createResourcePool(config: ResourcePoolConfig): ResourcePool {
    const pool: ResourcePool = {
      config,
      available: Array.from({ length: config.size }, (_, i) => ({ id: `res-${i}`, acquired: false, acquiredAt: 0, data: null }),
      waiting: [],
    };
    this.resourcePools.set(config.name, pool);
    return new ResourcePool(pool);
  }

  private async acquireResource(name: string): Promise<unknown> {
    const pool = this.resourcePools.get(name);
    if (!pool) throw new Error(`Resource pool "${name}" not found`);

    const available = pool.available.find((r) => !r.acquired);
    if (available) {
      available.acquired = true; available.acquiredAt = Date.now();
      return available.data;
    }

    // Wait for release
    return new Promise((resolve) => {
      pool.waiting.push({ resolve, acquiredAt: Date.now() });
    });
  }

  private releaseResource(name: string): void {
    const pool = this.resourcePools.get(name);
    if (!pool) return;

    // Return the resource to available pool
    const acquired = pool.available.find((r) => r.acquired);
    if (acquired) {
      acquired.acquired = false;
      acquired.data = null;
    }

    // Wake up waiter
    const waiter = pool.waiting.shift();
    if (waiter) waiter.resolve(acquired.data);
  }

  destroy(): void {
    this.stop();
    this.jobs.clear(); this.queue.length = 0;
    this.resourcePools.clear();
  }
}

// --- Resource Pool ---

class ResourcePool {
  config: ResourcePoolConfig;
  available: Array<{ id: string; acquired: boolean; acquiredAt: number; data: unknown }>;
  waiting: Array<{ resolve: (data: unknown) => void; acquiredAt: number }>;

  constructor(data: ResourcePool) { Object.assign(this, data); }
}

// --- Cron-Like Scheduler ---

export interface CronJob {
  id: string;
  expression: string; // Simplified cron: "* * * * *" or "*/5 * * * *"
  fn: () => Promise<void>;
  lastRun?: number;
  nextRun?: number;
  enabled: boolean;
  timezone?: string;
}

/** Simple cron expression parser and matcher */
export class CronScheduler {
  private jobs: CronJob[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  add(job: CronJob): void { this.jobs.push(job); }
  remove(id: string): void { this.jobs = this.jobs.filter((j) => j.id !== id); }

  start(checkIntervalMs = 60000): void {
    this.timer = setInterval(() => this.check(), checkIntervalMs);
  }

  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = null; }

  private check(): void {
    const now = Date.now();
    for (const job of this.jobs) {
      if (!job.enabled) continue;
      if (job.nextRun && now >= job.nextRun) {
        job.lastRun = now;
        job.nextRun = this.calculateNextRun(job.expression, job.lastRun);
        job.fn().catch(console.error);
      } else if (!job.lastRun || now >= (job.nextRun ?? 0)) {
        job.nextRun = this.calculateNextRun(job.expression, now);
      }
    }
  }

  /** Calculate next run time from simplified cron expression */
  private calculateNextRun(expression: string, after: number): number {
    const parts = expression.trim().split(/\s+/);
    if (parts.length < 5) return after + 60000; // Invalid, default 1 min

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    const date = new Date(after);

    // Find next matching time
    const matchMinute = minute === "*" ? -1 : parseInt(minute);
    const matchHour = hour === "*" ? -1 : parseInt(hour);
    const matchDay = dayOfMonth === "*" ? -1 : parseInt(dayOfMonth);
    const matchMonth = month === "*" ? -1 : parseInt(month);
    const matchDow = dayOfWeek === "*" ? -1 : parseInt(dayOfWeek);

    // Advance to next matching time (simplified - checks every minute)
    const next = new Date(after);
    next.setSeconds(0, 0);

    // Try up to 24 hours ahead
    for (let attempt = 0; attempt < 1440; attempt++) {
      if (next <= after) next.setMinutes(next.getMinutes() + 1);
      else next.setTime(after.getTime() + 60000);

      const m = next.getMinutes();
      const h = next.getHours();
      const d = next.getDate();
      const mo = next.getMonth() + 1;
      const dow = next.getDay();

      if ((matchMinute < 0 || m === matchMinute) &&
          (matchHour < 0 || h === matchHour) &&
          (matchDay < 0 || d === matchDay) &&
          (matchMonth < 0 || mo === matchMonth) &&
          (matchDow < 0 || dow === matchDow)) {
        return next.getTime();
      }
    }

    return after + 86400000; // Fallback: tomorrow
  }

  getJobs(): CronJob[] { return [...this.jobs]; }
}

// --- Rate Limiter (Token Bucket) ---

export class TokenBucketRateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefill: number;
  private queue: Array<{ resolve: () => void; timestamp: number }> = [];

  constructor(private tokensPerSecond: number, burstSize?: number) {
    this.maxTokens = burstSize ?? tokensPerSecond;
    this.tokens = this.maxTokens;
    this.refillRate = tokensPerSecond / 1000; // per ms
    this.lastRefill = Date.now();
  }

  async acquire(tokens = 1): Promise<void> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return;
    }

    return new Promise((resolve) => {
      this.queue.push({ resolve, timestamp: Date.now() });
    });
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const refillAmount = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + refillAmount);
    this.lastRefill = now;

    // Process waiters
    while (this.queue.length > 0 && this.tokens >= 1) {
      const waiter = this.queue.shift()!;
      this.tokens--;
      waiter.resolve();
    }
  }

  get availableTokens(): number { this.refill(); return this.tokens; }
}

// --- Deadlines / Timeout Manager ---

export class DeadlineManager {
  private timers = new Map<string, { deadline: number; handler: () => void; cleared: boolean }>();

  set(id: string, deadline: number, handler: () => void, onMiss?: () => void): void {
    this.clear(id);
    const ms = deadline - Date.now();
    if (ms <= 0) { handler(); return; }
    const timerId = setTimeout(() => {
      const entry = this.timers.get(id);
      if (entry && !entry.cleared) { entry.handler(); this.timers.delete(id); }
    }, ms);
    this.timers.set(id, { deadline, handler, cleared: false });
  }

  clear(id: string): void {
    const entry = this.timers.get(id);
    if (entry) { clearTimeout(Number(id.split("-").pop()) ?? 0); entry.cleared = true; this.timers.delete(id); }
  }

  clearAll(): void {
    for (const [id] of this.timers.keys()) this.clear(id);
  }

  getTimeRemaining(id: string): number {
    const entry = this.timers.get(id);
    if (!entry || entry.cleared) return 0;
    return Math.max(0, entry.deadline - Date.now());
  }
}
