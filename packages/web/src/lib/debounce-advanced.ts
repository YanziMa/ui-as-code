/**
 * Debounce and throttle with advanced options.
 * Note: This is the "advanced" version with more features than basic timer.ts.
 */

export interface DebounceOptions {
  /** Delay in milliseconds (default: 300) */
  delay?: number;
  /** Call on leading edge (default: false) */
  leading?: boolean;
  /** Call on trailing edge (default: true) */
  trailing?: boolean;
  /** Max wait time (default: 0 = no max) */
  maxWait?: number;
}

export interface ThrottleOptions {
  /** Minimum interval between calls in ms (default: 0 = no throttle) */
  interval?: number;
  /** Call immediately on first invocation (default: true) */
  leading?: boolean;
  /** Call once after last invocation (default: true) */
  trailing?: boolean;
}

/** Create a debounced version of a function */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: DebounceOptions = {},
): T & { cancel: () => void; flush: () => void } {
  const {
    delay = 300,
    leading = false,
    trailing = true,
    maxWait = 0,
  } = options;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime = 0;
  let lastArgs: Parameters<T> | null = null;

  function debounced(...args: Parameters<T>): unknown {
    const now = Date.now();

    // Check if we should invoke on leading edge
    if (leading && !timer && (now - lastCallTime >= delay)) {
      lastCallTime = now;
      return fn(...args);
    }

    lastArgs = args;

    // Clear existing timer
    if (timer !== null) {
      clearTimeout(timer);
    }

    // Check max wait
    const waitTime = maxWait > 0 ? Math.min(delay, maxWait - (now - lastCallTime)) : delay;

    timer = setTimeout(() => {
      timer = null;

      if (trailing && lastArgs) {
        lastCallTime = Date.now();
        fn(...lastArgs);
        lastArgs = null;
      }
    }, waitTime);

    return undefined;
  }

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  debounced.flush = () => {
    if (timer !== null && trailing && lastArgs) {
      clearTimeout(timer);
      timer = null;
      lastCallTime = Date.now();
      fn(...lastArgs);
      lastArgs = null;
    }
  };

  return debounced as T & { cancel: () => void; flush: () => void };
}

/** Create a throttled version of a function */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: ThrottleOptions = {},
): T & { cancel: () => void } {
  const {
    interval = 0,
    leading = true,
    trailing = true,
  } = options;

  let lastCallTime = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  function throttled(...args: Parameters<T>): unknown {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    // If within throttle interval, schedule for trailing edge
    if (timeSinceLastCall < interval) {
      lastArgs = args;

      if (!timer && trailing) {
        timer = setTimeout(() => {
          timer = null;
          if (lastArgs) {
            fn(...lastArgs);
            lastArgs = null;
          }
        }, interval - timeSinceLastCall);
      }

      return undefined;
    }

    // Clear pending trailing call
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }

    // Invoke
    lastCallTime = now;

    if (leading || timeSinceLastCall >= interval) {
      return fn(...args);
    }

    return undefined;
  }

  throttled.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return throttled as T & { cancel: () => void };
}

/** Request animation frame with fallback to setTimeout */
export function raf(callback: FrameRequestCallback): number | ReturnType<typeof setTimeout> {
  if (typeof window !== "undefined" && window.requestAnimationFrame) {
    return window.requestAnimationFrame(callback);
  }

  // Fallback for SSR or older browsers
  return setTimeout(callback, 16); // ~60fps
}

/** Cancel animation frame */
export function cancelRaf(id: number | ReturnType<typeof setTimeout>): void {
  if (typeof window !== "undefined" && window.cancelAnimationFrame) {
    window.cancelAnimationFrame(id as number);
  } else {
    clearTimeout(id);
  }
}

/** Run a callback on every animation frame until cancelled */
export function rafLoop(
  callback: (deltaTime: number, elapsed: number) => boolean | void,
): () => void {
  let running = true;
  let startTime: number | null = null;
  let rafId: number | ReturnType<typeof setTimeout>;

  function loop(time: number) {
    if (!running) return;

    if (startTime === null) {
      startTime = time;
    }

    const deltaTime = time - (startTime ?? time);
    const elapsed = time - (startTime ?? time);

    const shouldContinue = callback(deltaTime, elapsed);

    if (shouldContinue === false) {
      running = false;
      return;
    }

    rafId = raf(loop);
  }

  rafId = raf(loop);

  return () => {
    running = false;
    cancelRaf(rafId!);
  };
}

/** Run a function at a specific interval using raf for smooth animations */
export function setIntervalRaf(
  callback: () => void,
  intervalMs: number,
): () => void {
  let accumulated = 0;
  let lastTime: number | null = null;

  const cancel = rafLoop((delta) => {
    accumulated += delta;

    if (accumulated >= intervalMs) {
      accumulated -= intervalMs;
      callback();
    }

    return true; // Keep looping
  });

  return cancel;
}
