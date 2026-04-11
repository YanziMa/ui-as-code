/**
 * Enhanced React Hooks: Advanced hooks beyond the standard library,
 * including useDebounce, useThrottle, useLocalStorage, useMediaQuery,
 * useIntersectionObserver, useAsync, useToggle, useClickOutside,
 * useKeyPress, useWindowSize, useScroll, usePrevious, and more.
 */

import { useCallback, useEffect, useRef, useState } from "react";

// --- Types ---

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: Error | null;
}

// --- useDebounce ---

/**
 * Debounce a value change.
 *
 * @example
 * const [value, setValue] = useState("");
 * const debouncedValue = useDebounce(value, 300);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// --- useThrottle ---

/** Throttle a value change to at most once per interval */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdated = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastUpdated.current;

    if (elapsed >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - elapsed);

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

// --- useLocalStorage ---

/**
 * Sync state with localStorage.
 *
 * @example
 * const [name, setName] = useLocalStorage("username", "Guest");
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const next = value instanceof Function ? value(prev) : value;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage full or unavailable
      }
      return next;
    });
  }, [key]);

  const remove = useCallback(() => {
    try { window.localStorage.removeItem(key); } catch {}
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, remove];
}

// --- useMediaQuery ---

/** Watch a CSS media query match state */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    mql.addEventListener("change", handler);
    setMatches(mql.matches);

    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

// --- useIntersectionObserver ---

export interface UseIntersectionObserverOptions {
  /** Margin around the root */
  rootMargin?: string;
  /** Visibility threshold(s) */
  threshold?: number | number[];
  /** Root element for intersection */
  root?: Element | null;
}

/** Observe element visibility in viewport */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {},
): [React.RefCallback<Element>, IntersectionObserverEntry | null] {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const nodeRef = useRef<Element | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback((node: Element | null) => {
    if (nodeRef.current) {
      observerRef.current?.unobserve(nodeRef.current);
    }
    nodeRef.current = node;
    if (node) {
      const observer = new IntersectionObserver(([e]) => setEntry(e), options);
      observerRef.current = observer;
      observer.observe(node);
    }
  }, [options.rootMargin, JSON.stringify(options.threshold), options.root]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return [ref, entry];
}

// --- useAsync ---

/**
 * Manage async operation state.
 *
 * @example
 * const { execute, data, error, loading } = useAsync(fetchData);
 * await execute();
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  immediate = false,
): AsyncState<T> & { execute: (...args: unknown[]) => Promise<T>; reset: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    status: "idle",
    data: null,
    error: null,
  });

  const mountedRef = useRef(true);

  const execute = useCallback(async (..._args: unknown[]): Promise<T> => {
    setState({ status: "loading", data: null, error: null });
    try {
      const result = await asyncFn();
      if (mountedRef.current) setState({ status: "success", data: result, error: null });
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (mountedRef.current) setState({ status: "error", data: null, error });
      throw error;
    }
  }, [asyncFn]);

  const reset = useCallback(() => setState({ status: "idle", data: null, error: null }), []);

  useEffect(() => {
    if (immediate) execute();
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, execute, reset };
}

// --- useToggle ---

/** Simple boolean toggle hook */
export function useToggle(initialValue = false): [boolean, () => void, (v: boolean) => void] {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle, setValue];
}

// --- useClickOutside ---

/** Detect clicks outside a referenced element */
export function useClickOutside(handler: () => void): React.RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [handler]);

  return ref;
}

// --- useKeyPress ---

/** Listen for specific keyboard press events */
export function useKeyPress(
  targetKey: string,
  handler?: (e: KeyboardEvent) => void,
  options?: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean },
): boolean {
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const downHandler = (e: KeyboardEvent) => {
      if (
        e.key === targetKey &&
        (options?.metaKey ? e.metaKey : true) &&
        (options?.ctrlKey ? e.ctrlKey : true) &&
        (options?.shiftKey ? e.shiftKey : true) &&
        (options?.altKey ? e.altKey : true)
      ) {
        setPressed(true);
        handler?.(e);
      }
    };

    const upHandler = (e: KeyboardEvent) => {
      if (e.key === targetKey) setPressed(false);
    };

    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);

    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  }, [targetKey, handler, options?.metaKey, options?.ctrlKey, options?.shiftKey, options?.altKey]);

  return pressed;
}

// --- useWindowSize ---

/** Track window dimensions */
export function useWindowSize(): { width: number; height: number } {
  const [size, setSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return size;
}

// --- useScroll ---

/** Track scroll position */
export function useScroll(): { x: number; y: number; direction: "up" | "down" | null } {
  const [scroll, setScroll] = useState({ x: 0, y: 0, direction: null as "up" | "down" | null });
  const prevY = useRef(0);

  useEffect(() => {
    const handler = () => {
      const y = window.scrollY;
      setScroll({
        x: window.scrollX,
        y,
        direction: y > prevY.current ? "down" : y < prevY.current ? "up" : scroll.direction,
      });
      prevY.current = y;
    };

    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [scroll.direction]);

  return scroll;
}

// --- usePrevious ---

/** Return the previous value of a variable */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}

// --- useMounted ---

/** Check if component is currently mounted */
export function useMounted(): React.MutableRefObject<boolean> {
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  return mounted;
}

// --- useInterval ---

/** Wrapper around setInterval that cleans up on unmount */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => { savedCallback.current = callback; }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// --- useTimeout ---

/** Wrapper around setTimeout that cleans up on unmount */
export function useTimeout(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => { savedCallback.current = callback; }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setTimeout(() => savedCallback.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
}

// --- useRafLoop ---

/** Run callback on every animation frame */
export function useRafLoop(callback: (deltaTime: number) => void, active = true): { start: () => void; stop: () => void } {
  const rafId = useRef<number>(0);
  const lastTime = useRef<number>(0);
  const activeRef = useRef(active);

  const loop = useCallback((time: number) => {
    if (!activeRef.current) return;
    const dt = lastTime.current ? time - lastTime.current : 16;
    lastTime.current = time;
    callback(dt);
    rafId.current = requestAnimationFrame(loop);
  }, [callback]);

  useEffect(() => {
    activeRef.current = active;
    if (active) {
      lastTime.current = 0;
      rafId.current = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(rafId.current);
    }
    return () => cancelAnimationFrame(rafId.current);
  }, [active, loop]);

  return {
    start: useCallback(() => { activeRef.current = true; rafId.current = requestAnimationFrame(loop); }, [loop]),
    stop: useCallback(() => { activeRef.current = false; }, []),
  };
}
