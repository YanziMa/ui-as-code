/**
 * Custom React hooks for common patterns.
 * Note: These are designed for use in client components ("use client").
 */

import { useRef, useEffect, useCallback, useState, useSyncExternalStore } from "react";

/** Options for useDebouncedValue hook */
interface DebounceOptions {
  /** Delay in milliseconds (default: 300) */
  delay?: number;
  /** Value to use while debouncing (default: initial value) */
  leadingValue?: unknown;
}

/**
 * Returns a debounced version of a value.
 * Updates the returned value only after the specified delay
 * without changes.
 */
export function useDebouncedValue<T>(value: T, options: DebounceOptions = {}): T {
  const { delay = 300 } = options;
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Returns a throttled version of a callback function.
 */
export function useThrottledCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number,
): T {
  const lastRun = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const throttled = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        callback(...args);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastRun.current = Date.now();
          timeoutRef.current = null;
          callback(...args);
        }, delay - (now - lastRun.current));
      }
    },
    [callback, delay],
  ) as T;

  // Cleanup on unmount
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return throttled;
}

/**
 * Hook that returns true when component is mounted on client.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/**
 * Hook for tracking previous value of a variable.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}

/**
 * Hook for boolean toggle with explicit setTrue/setFalse/toggle.
 */
export function useToggle(initial = false): {
  value: boolean;
  setTrue: () => void;
  setFalse: () => void;
  toggle: () => void;
  setValue: (v: boolean) => void;
} {
  const [value, setValue] = useState(initial);
  return {
    value,
    setTrue: useCallback(() => setValue(true), []),
    setFalse: useCallback(() => setValue(false), []),
    toggle: useCallback(() => setValue((v) => !v), []),
    setValue,
  };
}

/**
 * Hook for local storage state with SSR safety.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const next = value instanceof Function ? value(prev) : value;
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch { /* quota exceeded */ }
      }
      return next;
    });
  }, [key]);

  return [storedValue, setValue];
}

/**
 * Hook for media query matching.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Hook for clicking outside an element.
 */
export function useClickOutside<T extends HTMLElement>(
  handler: () => void,
): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);

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

/**
 * Hook for intersection observer (lazy loading, scroll animations).
 */
export function useIntersectionObserver(
  options?: IntersectionObserverInit,
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);
    return () => observer.disconnect();
  }, [options]);

  return [ref, isIntersecting];
}

/**
 * Hook for copying text to clipboard with status feedback.
 */
export function useClipboard(resetDelay = 2000): {
  copied: boolean;
  copy: (text: string) => Promise<boolean>;
} {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetDelay);
      return true;
    } catch {
      return false;
    }
  }, [resetDelay]);

  return { copied, copy };
}
