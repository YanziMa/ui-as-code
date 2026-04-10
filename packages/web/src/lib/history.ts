/**
 * History Manager: Enhanced History API wrapper with state management,
 * navigation guards (confirm before leaving), scroll position restoration,
 * deep linking, navigation stack inspection, programmatic back/forward,
 * hash-based routing helpers, and custom transition support.
 */

// --- Types ---

export interface HistoryState {
  /** Route/path identifier */
  path?: string;
  /** Arbitrary state data */
  data?: Record<string, unknown>;
  /** Scroll position to restore */
  scrollX?: number;
  scrollY?: number;
  /** Timestamp of this entry */
  timestamp?: number;
}

export interface NavigationGuard {
  /** Guard function — return true to allow, false/message to block */
  guard: () => boolean | string;
  /** Unique ID */
  id: string;
}

export interface HistoryManagerOptions {
  /** Base path for the application (default: "/") */
  basePath?: string;
  /** Save and restore scroll position on navigation? (default: true) */
  saveScrollPosition?: boolean;
  /** Use hash-based routing fallback? (default: false) */
  useHash?: string;
  /** Callback on every navigation */
  onNavigate?: (state: HistoryState, action: "push" | "replace" | "pop") => void;
  /** Maximum history entries to track (default: 50) */
  maxHistoryLength?: number;
}

export interface HistoryManagerInstance {
  /** Current history state */
  getState: () => HistoryState;
  /** Current path (from location) */
  getPath: () => string;
  /** Current full URL */
  getUrl: () => string;
  /** Push a new entry (navigate forward) */
  push: (path: string, state?: Record<string, unknown>) => void;
  /** Replace current entry (no new history entry) */
  replace: (path: string, state?: Record<string, unknown>) => void;
  /** Go back in history */
  back: () => void;
  /** Go forward in history */
  forward: () => void;
  /** Go N entries (-1 = back, +1 = forward) */
  go: (delta: number) => void;
  /** Get current history length */
  getLength: () => number;
  /** Get all tracked states (for breadcrumbs etc.) */
  getStack: () => HistoryState[];
  /** Check if can go back */
  canGoBack: () => boolean;
  /** Check if can go forward */
  canGoForward: () => void;
  /** Add a navigation guard (returns unsubscribe) */
  addGuard: (guard: () => boolean | string) => () => void;
  /** Remove a guard by ID */
  removeGuard: (id: string) => void;
  /** Clear all guards */
  clearGuards: () => void;
  /** Block/unblock navigation (e.g., during form editing) */
  setBlocked: (blocked: boolean | string) => void;
  /** Check if currently blocked */
  isBlocked: () => boolean | string;
  /** Create a deep link for sharing */
  createDeepLink: (path: string, params?: Record<string, string>) => string;
  /** Parse query parameters from current URL */
  getQueryParams: () => Record<string, string>;
  /** Get hash portion of URL */
  getHash: () => string;
  /** Set hash without triggering navigation */
  setHash: (hash: string) => void;
  /** Subscribe to popstate events */
  onPopState: (callback: (state: HistoryState) => void) => () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function buildFullPath(basePath: string, path: string): string {
  const base = basePath.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

// --- Main Class ---

export class HistoryManager {
  create(options: HistoryManagerOptions = {}): HistoryManagerInstance {
    let destroyed = false;

    const opts = {
      basePath: options.basePath ?? "/",
      saveScrollPosition: options.saveScrollPosition ?? true,
      useHash: options.useHash,
      maxHistoryLength: options.maxHistoryLength ?? 50,
    };

    // State
    let blocked: boolean | string = false;
    const guards = new Map<string, NavigationGuard>();
    const stack: HistoryState[] = [];
    const popListeners = new Set<(state: HistoryState) => void>();

    // Initialize stack with current state
    function initStack(): void {
      const currentState: HistoryState = {
        path: getCurrentPath(),
        data: (history.state as HistoryState?.data) ?? {},
        timestamp: Date.now(),
      };
      stack.push(currentState);
    }

    function getCurrentPath(): string {
      if (opts.useHash) {
        return window.location.hash.replace(new RegExp(`^${opts.useHash}`), "") || "/";
      }
      return window.location.pathname;
    }

    // Popstate listener
    const handlePopState = (event: PopStateEvent): void => {
      if (destroyed) return;

      // Run guards
      if (!checkGuards()) return;

      // Save scroll for previous entry
      if (opts.saveScrollPosition && stack.length > 0) {
        stack[stack.length - 1]!.scrollX = window.scrollX;
        stack[stack.length - 1]!.scrollY = window.scrollY;
      }

      const newState: HistoryState = {
        path: getCurrentPath(),
        data: event.state?.data ?? {},
        timestamp: Date.now(),
      };
      stack.push(newState);

      // Trim stack
      while (stack.length > opts.maxHistoryLength) {
        stack.shift();
      }

      // Restore scroll position
      if (opts.saveScrollPosition && newState.scrollY != null) {
        requestAnimationFrame(() => {
          window.scrollTo(newState.scrollX ?? 0, newState.scrollY!);
        });
      }

      options.onNavigate?.(newState, "pop");
      for (const cb of popListeners) cb(newState);
    };

    window.addEventListener("popstate", handlePopState);

    initStack();

    function checkGuards(): boolean {
      if (typeof blocked === "string" || blocked === true) {
        if (typeof blocked === "string") {
          // Show confirmation
          if (!confirm(blocked)) return false;
        } else {
          return false;
        }
      }

      for (const [, guard] of guards) {
        const result = guard.guard();
        if (result === false || typeof result === "string") {
          if (typeof result === "string") {
            if (!confirm(result)) return false;
          }
          return false;
        }
      }

      return true;
    }

    function doPush(path: string, stateData?: Record<string, unknown>, action: "push" | "replace" = "push"): void {
      if (!checkGuards()) return;

      const fullPath = opts.useHash ? `${window.location.pathname}${window.location.search}#${opts.useHash}${buildFullPath("", path)}` : buildFullPath(opts.basePath, path);

      // Save scroll for current entry
      if (opts.saveScrollPosition && stack.length > 0) {
        stack[stack.length - 1]!.scrollX = window.scrollX;
        stack[stack.length - 1]!.scrollY = window.scrollY;
      }

      const historyState: HistoryState = {
        path,
        data: stateData,
        timestamp: Date.now(),
      };

      try {
        if (action === "push") {
          history.pushState(historyState, "", fullPath);
        } else {
          history.replaceState(historyState, "", fullPath);
        }
      } catch {
        // May fail for cross-origin URLs
      }

      stack.push(historyState);
      while (stack.length > opts.maxHistoryLength) stack.shift();

      options.onNavigate?.(historyState, action);
    }

    const instance: HistoryManagerInstance = {

      getState(): HistoryState {
        return {
          path: getCurrentPath(),
          data: (history.state as HistoryState)?.data ?? {},
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        };
      },

      getPath: getCurrentPath,

      getUrl: () => window.location.href,

      push(path, state?): void {
        doPush(path, state, "push");
      },

      replace(path, state?): void {
        doPush(path, state, "replace");
      },

      back(): void {
        if (!checkGuards()) return;
        history.back();
      },

      forward(): void {
        if (!checkGuards()) return;
        history.forward();
      },

      go(delta): void {
        if (!checkGuards()) return;
        history.go(delta);
      },

      getLength: () => history.length,

      getStack: () => [...stack],

      canGoBack: () => history.length > 1,

      canGoForward: () => history.length < stack.length,

      addGuard(guardFn): () => void {
        const id = crypto.randomUUID();
        guards.set(id, { guard: guardFn, id });
        return () => { guards.delete(id); };
      },

      removeGuard(id: string): void {
        guards.delete(id);
      },

      clearGuards(): void {
        guards.clear();
      },

      setBlocked(b: boolean | string): void {
        blocked = b;
      },

      isBlocked: () => blocked,

      createDeepLink(path, params?): string {
        let url = buildFullPath(opts.basePath, path);
        if (params && Object.keys(params).length > 0) {
          const search = Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
            .join("&");
          url += `?${search}`;
        }
        return `${window.location.origin}${url}`;
      },

      getQueryParams(): Record<string, string> {
        const params: Record<string, string> = {};
        const search = window.location.search.slice(1);
        if (!search) return params;

        for (const pair of search.split("&")) {
          const [key, ...rest] = pair.split("=");
          if (key) {
            params[decodeURIComponent(key)] = decodeURIComponent(rest.join("="));
          }
        }
        return params;
      },

      getHash: () => window.location.hash,

      setHash(hash: string): void {
        // Using replaceState to avoid triggering popstate
        const url = `${window.location.pathname}${window.location.search}#${hash.startsWith("#") ? hash : "#" + hash}`;
        history.replaceState(history.state, "", url);
      },

      onPopState(callback): () => void {
        popListeners.add(callback);
        return () => { popListeners.delete(callback); };
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;
        window.removeEventListener("popstate", handlePopState);
        guards.clear();
        popListeners.clear();
        stack.length = 0;
      },
    };

    return instance;
  }
}

/** Convenience: create a history manager */
export function createHistoryManager(options?: HistoryManagerOptions): HistoryManagerInstance {
  return new HistoryManager().create(options);
}
