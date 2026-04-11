/**
 * Scheduler Utilities: Task scheduling, job queues, cron-like scheduling,
 * rate limiting, debounce/throttle with cancel, delayed execution,
 * requestAnimationFrame wrapper, interval/timer management, and
 * idle callback scheduling.
 */

// --- Types ---

export interface ScheduledJob {
  /** Job ID */
  id: string;
  /** Callback to execute */
  fn: () => void | Promise<void>;
  /** Interval in ms (0 = one-shot) */
  interval: number;
  /** Delay before first execution (ms) */
  delay?: number;
  /** Maximum number of executions (0 = unlimited) */
  maxRuns?: number;
  /** Whether job is currently active */
  active: boolean;
  /** Last execution timestamp */
  lastRun: number | null;
  /** Run count */
  runCount: number;
  /** Timer handle */
  timerHandle: ReturnType<typeof setTimeout> | null;
  /** Cleanup function */
  destroy: () => void;
}

export interface SchedulerInstance {
  /** Schedule a recurring job */
  schedule: (job: Omit<ScheduledJob, "id">) => string;
  /** Schedule a one-shot delayed task */
  setTimeout: (fn: () => void, delayMs: number) => string;
  /** Schedule at interval */
  setInterval: (fn: () => void, intervalMs: number) => string;
  /** Cancel a job by ID */
  cancel: (id: string) => boolean;
  /** Get job info */
  getJob: (id: string) => ScheduledJob | undefined;
  /** Get all active jobs */
  getJobs: () => ScheduledJob[];
  /** Pause all jobs */
  pause: () => void;
  /** Resume all jobs */
  resume: () => void;
  /** Clear all jobs */
  clear: () => void;
  /** Destroy scheduler */
  destroy: () => void;
}

// --- Debounce ---

interface DebounceState {
  fn: () => void;
  timer: ReturnType<typeof setTimeout> | null;
  lastCall: number;
}

/**
 * Create a debounced function — delays invocation until after pause.
 * Returns a wrapped function with .cancel() and .flush() methods.
 *
 * @example
 * ```ts
 * const search = debounce((q) => fetchResults(q), 300);
 * search("hello"); // Will fire 300ms after last call
 * search("world"); // Resets timer, fires 300ms after
 * search.cancel(); // Cancels pending call
 * search.flush(); // Fires immediately
 * ```
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  waitMs = 300,
): T & { cancel: () => void; flush: () => void } {
  let state: DebounceState | null = null;

  const debounced = ((...args: unknown[]) => {
    if (state) clearTimeout(state.timer);
    state = {
      fn,
      timer: setTimeout(() => {
        state = null;
        fn(...args);
      }, waitMs),
      lastCall: Date.now(),
    };
  }) as T & { cancel: () => void; flush: () => void };

  debounced.cancel = () => {
    if (state) { clearTimeout(state.timer); state = null; }
  };

  debounced.flush = () => {
    if (state) { clearTimeout(state.timer); state = null; fn(); }
  };

  return debounced;
}

// --- Throttle ---

interface ThrottleState {
  fn: () => void;
  lastRun: number;
  timer: ReturnType<typeof setTimeout> | null;
  trailingTimer: ReturnType<typeof setTimeout> | null;
  trailing: boolean;
}

/**
 * Create a throttled function — limits invocations to once per period.
 * Supports leading (fire immediately) and trailing (fire after cooldown) edges.
 *
 * @example
 * ```ts
 * const save = throttle(() => persistData(), 1000);
 * window.addEventListener("resize", save); // At most once per second
 * ```
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limitMs = 1000,
  options?: { leading?: boolean; trailing?: boolean },
): T & { cancel: () => void } {
  const leading = options?.leading !== false;
  const trailing = options?.trailing !== false;

  let state: ThrottleState = {
    fn,
    lastRun: 0,
    timer: null,
    trailingTimer: null,
    trailing,
  };

  const throttled = ((...args: unknown[]) => {
    const now = Date.now();

    if (leading) {
      if (now - state.lastRun >= limitMs) {
        state.lastRun = now;
        state.fn(...args);
        if (trailing) state.trailingTimer = null;
        return;
      }
    }

    if (trailing) {
      if (state.trailingTimer) clearTimeout(state.trailingTimer);
      state.trailingTimer = setTimeout(() => {
        state.lastRun = now;
        state.fn(...args);
        state.trailingTimer = null;
      }, limitMs - (now - state.lastRun));
    }
  }) as T & { cancel: () => void };

  throttled.cancel = () => {
    if (state.timer) clearTimeout(state.timer);
    if (state.trailingTimer) clearTimeout(state.trailingTimer);
  };

  return throttled;
}

// --- RAF Wrapper ---

/**
 * Wrap requestAnimationFrame with auto-cleanup on visibility change.
 * Pauses when tab is hidden, resumes when visible.
 */
export function rafLoop(callback: (dt: number) => void): { cancel: () => void; paused: boolean } {
  let rafId: number | null = null;
  let running = true;
  let paused = false;
  let lastTime = performance.now();

  function loop(timestamp: number) {
    if (!running || paused) return;
    rafId = requestAnimationFrame(loop);
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    callback(dt);
  }

  // Auto-pause when hidden
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { paused = true; if (rafId) cancelAnimationFrame(rafId); }
    else { paused = false; lastTime = performance.now(); loop(performance.now()); }
  });

  rafId = requestAnimationFrame(loop);

  return {
    cancel: () => { running = false; if (rafId) cancelAnimationFrame(rafId); },
    get paused() { return paused; },
  };
}

// --- Idle Callback ---

/**
 * Schedule a callback to run during browser idle time.
 * Falls back to setTimeout if requestIdleCallback is unavailable.
 */
export function scheduleIdle(
  callback: () => void,
  options?: { timeout?: number },
): { cancel: () => void } {
  let cancelled = false;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

  const doWork = () => {
    if (!cancelled) callback();
  };

  if ("requestIdleCallback" in window) {
    const handle = (deadline: IdleDeadline) => {
      if (cancelled) return;
      const timeout = options?.timeout ?? 2000;
      if (deadline.timeRemaining() > 1 || deadline.timeout(timeout)) {
        doWork();
      } else {
        // Not enough time, retry after short delay
        fallbackTimer = setTimeout(doWork, 50);
      }
    };
    (requestIdleCallback(handle) as () => void)(doWork);
  } else {
    fallbackTimer = setTimeout(doWork, options?.timeout ?? 100);
  }

  return {
    cancel: () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if ("cancelIdleCallback" in window) cancelIdleCallback(doWork);
    },
  };
}

// --- Rate Limiter ---

/**
 * Token bucket rate limiter.
 *
 * @example
 * ```ts
 * const limiter = new RateLimiter(10, 1000); // 10 requests per second
 * if (limiter.tryAcquire()) { makeRequest(); } else { queueRequest(); }
 * ```
 */
export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillInterval: number;
  private lastRefill: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(rate: number, perMs = 1000) {
    this.maxTokens = rate;
    this.tokens = rate;
    this.refillInterval = perMs / rate;
    this.lastRefill = Date.now();

    this.timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - this.lastRefill;
      const tokensToAdd = Math.floor(elapsed / this.refillInterval);
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }, 100);
  }

  /** Try to consume one token. Returns true if allowed. */
  tryAcquire(count = 1): boolean {
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  /** How many tokens are available */
  available(): number { return this.tokens; }

  /** Destroy and stop refilling */
  destroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}

// --- Cron-like Scheduler ---

/**
 * Simple scheduler for managing timed/recurring jobs.
 */
export function createScheduler(options?: { debug?: boolean }): SchedulerInstance {
  const jobs = new Map<string, ScheduledJob>();
  let paused = false;
  const debug = options?.debug ?? false;

  function schedule(jobOpts: Omit<ScheduledJob, "id" | "destroy">): string {
    const id = jobOpts.id ?? `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job: ScheduledJob = {
      id,
      fn: jobOpts.fn,
      interval: jobOpts.interval,
      delay: jobOpts.delay ?? 0,
      maxRuns: jobOpts.maxRuns ?? 0,
      active: true,
      lastRun: null,
      runCount: 0,
      timerHandle: null,
      destroy: () => {},
    };

    jobs.set(id, job);

    if (job.delay > 0) {
      job.timerHandle = setTimeout(() => _startJob(job), job.delay) as unknown as ReturnType<typeof setTimeout>;
    } else {
      _startJob(job);
    }

    if (debug) console.log(`[Scheduler] Scheduled job ${id} (interval=${job.interval}ms)`);

    return id;
  }

  function _startJob(job: ScheduledJob): void {
    if (paused || !job.active || (job.maxRuns > 0 && job.runCount >= job.maxRuns)) {
      if (job.maxRuns > 0 && job.runCount >= job.maxRuns) {
        jobs.delete(job.id);
      }
      return;
    }

    try { job.fn(); } catch (e) { if (debug) console.error(`[Scheduler] Job ${job.id} error:`, e); }
    job.lastRun = Date.now();
    job.runCount++;

    if (job.interval > 0 && (job.maxRuns === 0 || job.runCount < job.maxRuns)) {
      job.timerHandle = setTimeout(() => _startJob(job), job.interval) as unknown as ReturnType<typeof setTimeout>;
    } else if (job.maxRuns > 0 && job.runCount >= job.maxRuns) {
      jobs.delete(job.id);
    }
  }

  function setTimeoutFn(fn: () => void, delayMs: number): string {
    const id = `timeout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const handle = setTimeout(() => {
      try { fn(); } catch (e) {}
      jobs.delete(id);
    }, delayMs);
    jobs.set(id, { id, fn, interval: 0, active: true, lastRun: Date.now(), runCount: 0, timerHandle: handle, destroy: () => { clearTimeout(handle); } });
    return id;
  }

  function setIntervalFn(fn: () => void, intervalMs: number): string {
    return schedule({ id: `interval_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, fn, interval: intervalMs });
  }

  function cancel(id: string): boolean {
    const job = jobs.get(id);
    if (!job) return false;
    job.active = false;
    if (job.timerHandle) clearTimeout(job.timerHandle);
    jobs.delete(id);
    if (debug) console.log(`[Scheduler] Cancelled job ${id}`);
    return true;
  }

  function getJob(id: string): ScheduledJob | undefined { return jobs.get(id); }
  function getJobs(): ScheduledJob[] { return Array.from(jobs.values()); }

  function pauseAll(): void {
    paused = true;
    for (const job of jobs.values()) {
      if (job.timerHandle) clearTimeout(job.timerHandle);
    }
    if (debug) console.log("[Scheduler] All jobs paused");
  }

  function resumeAll(): void {
    paused = false;
    for (const job of jobs.values()) {
      if (job.active && !job.timerHandle) _startJob(job);
    }
    if (debug) console.log("[Scheduler] All jobs resumed");
  }

  function clear(): void {
    for (const job of jobs.values()) {
      if (job.timerHandle) clearTimeout(job.timerHandle);
      job.destroy();
    }
    jobs.clear();
  }

  function destroy(): void { clear(); }

  return { schedule, setTimeout: setTimeoutFn, setInterval: setIntervalFn, cancel, getJob, getJobs, pause: pauseAll, resume: resumeAll, clear, destroy };
}
