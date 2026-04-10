/**
 * Context Provider: React-like Context/Provider pattern for vanilla TypeScript.
 * Enables dependency injection, theme propagation, i18n context sharing,
 * and hierarchical context override with change notification.
 */

// --- Types ---

export interface ContextOptions<T> {
  /** Default value (used when no Provider wraps the consumer) */
  defaultValue: T;
  /** Context name (for debugging) */
  name?: string;
  /** Called when value changes (optional) */
  onChange?: (newValue: T, oldValue: T) => void;
}

export interface ProviderInstance<T> {
  /** Root DOM element of this provider */
  element: HTMLDivElement;
  /** Get current value */
  getValue: () => T;
  /** Set new value (notifies all consumers) */
  setValue: (value: T) => void;
  /** Update value with a function (like React's setState) */
  updateValue: (updater: (prev: T) => T) => void;
  /** Subscribe to changes (returns unsubscribe function) */
  subscribe: (listener: (value: T) => void) => () => void;
  /** Destroy provider and cleanup */
  destroy: () => void;
}

export interface ConsumerHandle<T> {
  /** Get current context value */
  getValue: () => T;
  /** Subscribe to changes */
  subscribe: (listener: (value: T) => void) => () => void;
}

// --- Symbol for storing context on DOM elements ---

const CONTEXT_DATA_KEY = "__context_data__";

interface ContextData<T> {
  options: ContextOptions<T>;
  currentValue: T;
  listeners: Set<(value: T) => void>;
  providers: Set<HTMLDivElement>;
}

// Global registry of all contexts
const contextRegistry = new Map<string, unknown>();

// --- Context Creation ---

export interface Context<T> {
  /** Create a Provider that wraps children with this context */
  Provider: (value: T, children?: HTMLElement | (() => HTMLElement)) => ProviderInstance<T>;
  /** Consume the nearest Provider's value (from within its DOM tree) */
  consume: (startElement: HTMLElement) => T;
  /** Consume with reactive subscription handle */
  consumeReactive: (startElement: HTMLElement) => ConsumerHandle<T>;
  /** Get default value */
  getDefaultValue: () => T;
  /** Context name */
  name: string;
}

/**
 * Create a new Context (similar to React.createContext).
 *
 * @example
 * ```ts
 * const ThemeContext = createContext({ mode: "light", primaryColor: "#4338ca" });
 *
 * // Provide:
 * const provider = ThemeContext.Provider({ mode: "dark", primaryColor: "#8b5cf6" }, appEl);
 *
 * // Consume anywhere inside appEl:
 * const theme = ThemeContext.consume(someElement);
 * ```
 */
export function createContext<T>(options: ContextOptions<T>): Context<T> {
  const contextId = `ctx_${options.name ?? "anonymous"}_${Math.random().toString(36).slice(2, 8)}`;
  const data: ContextData<T> = {
    options,
    currentValue: options.defaultValue,
    listeners: new Set(),
    providers: new Set(),
  };

  contextRegistry.set(contextId, data);

  const ctx: Context<T> = {
    name: options.name ?? contextId,

    getDefaultValue() { return options.defaultValue; },

    Provider(value: T, children?: HTMLElement | (() => HTMLElement)): ProviderInstance<T> {
      const root = document.createElement("div");
      root.className = `context-provider ${options.name ? `context-${options.name}` : ""}`;
      root.style.cssText = "display:contents;"; // Invisible wrapper
      root.dataset.contextId = contextId;

      // Store reference to this provider's data
      (root as any)[CONTEXT_DATA_KEY] = data;

      // Update current value
      const oldValue = data.currentValue;
      data.currentValue = value;
      data.providers.add(root);

      // Append children
      if (children) {
        const childEl = typeof children === "function" ? children() : children;
        root.appendChild(childEl);
      }

      const instance: ProviderInstance<T> = {
        element: root,

        getValue() { return data.currentValue; },

        setValue(newValue: T) {
          const old = data.currentValue;
          if (old === newValue) return;
          data.currentValue = newValue;
          data.options.onChange?.(newValue, old);
          notifyListeners(data);
        },

        updateValue(updater: (prev: T) => T) {
          instance.setValue(updater(data.currentValue));
        },

        subscribe(listener: (value: T) => void): () => void {
          data.listeners.add(listener);
          listener(data.currentValue); // Immediate call with current value
          return () => { data.listeners.delete(listener); };
        },

        destroy() {
          data.providers.delete(root);
          root.remove();
        },
      };

      return instance;
    },

    consume(startElement: HTMLElement): T {
      return resolveContext(startElement, contextId).currentValue;
    },

    consumeReactive(startElement: HTMLElement): ConsumerHandle<T> {
      const resolved = resolveContext(startElement, contextId);
      return {
        getValue: () => resolved.currentValue,
        subscribe(listener: (value: T) => void): () => void {
          resolved.listeners.add(listener);
          listener(resolved.currentValue);
          return () => { resolved.listeners.delete(listener); };
        },
      };
    },
  };

  return ctx;
}

function resolveContext<T>(startElement: HTMLElement, contextId: string): ContextData<T> {
  // Walk up DOM tree to find nearest provider
  let el: HTMLElement | null = startElement;

  while (el) {
    const stored = (el as any)[CONTEXT_DATA_KEY];
    if (stored && (el as any).dataset?.contextId === contextId) {
      return stored as ContextData<T>;
    }

    // Also check if element is inside a provider by checking parent chain
    // for elements with our contextId
    if (el.dataset?.contextId === contextId) {
      const data = contextRegistry.get(contextId) as ContextData<T> | undefined;
      if (data) return data;
    }

    el = el.parentElement;
  }

  // Fall back to global registry
  const globalData = contextRegistry.get(contextId) as ContextData<T> | undefined;
  if (globalData) return globalData;

  throw new Error(`Context "${contextId}" not found. No Provider wrapping this element.`);
}

function notifyListeners<T>(data: ContextData<T>): void {
  for (const listener of data.listeners) {
    try { listener(data.currentValue); } catch { /* ignore listener errors */ }
  }
}

// --- Built-in Common Contexts ---

/** Theme context with light/dark mode and accent color */
export interface ThemeContextValue {
  mode: "light" | "dark";
  primaryColor: string;
  borderRadius: number;
  fontSize: number;
}

export const ThemeContext = createContext<ThemeContextValue>({
  defaultValue: {
    mode: "light",
    primaryColor: "#4338ca",
    borderRadius: 8,
    fontSize: 14,
  },
  name: "theme",
});

/** Auth context with user info and login state */
export interface AuthContextValue {
  isAuthenticated: boolean;
  user: { id: string; name: string; email: string; avatar?: string } | null;
  token: string | null;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  defaultValue: {
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true,
  },
  name: "auth",
});

/** i18n / locale context */
export interface I18nContextValue {
  locale: string;
  dir: "ltr" | "rtl";
  formatDate: (date: Date | string) => string;
  formatNumber: (num: number) => string;
}

export const I18nContext = createContext<I18nContextValue>({
  defaultValue: {
    locale: "en",
    dir: "ltr",
    formatDate: (d) => new Date(d).toLocaleDateString("en"),
    formatNumber: (n) => n.toLocaleString("en"),
  },
  name: "i18n",
});

/** Breakpoints / responsive context */
export interface ResponsiveContextValue {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: "xs" | "sm" | "md" | "lg" | "xl";
}

export const ResponsiveContext = createContext<ResponsiveContextValue>({
  defaultValue: {
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    breakpoint: "lg",
  },
  name: "responsive",
});

// --- Auto-responsive Provider helper ---

/**
 * Create a ResponsiveContext provider that auto-updates on window resize.
 * Returns a ProviderInstance with auto-cleanup.
 */
export function createResponsiveProvider(
  children?: HTMLElement | (() => HTMLElement),
): ProviderInstance<ResponsiveContextValue> & { destroy: () => void } {
  const getValues = (): ResponsiveContextValue => ({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth < 640,
    isTablet: window.innerWidth >= 640 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
    breakpoint: window.innerWidth < 640 ? "xs"
      : window.innerWidth < 768 ? "sm"
      : window.innerWidth < 1024 ? "md"
      : window.innerWidth < 1280 ? "lg"
      : "xl",
  });

  const provider = ResponsiveContext.Provider(getValues(), children);

  // Auto-update on resize
  let rafId: number;
  const resizeHandler = () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      provider.setValue(getValues());
    });
  };

  window.addEventListener("resize", resizeHandler);

  // Override destroy to clean up resize listener
  const originalDestroy = provider.destroy;
  provider.destroy = () => {
    window.removeEventListener("resize", resizeHandler);
    cancelAnimationFrame(rafId);
    originalDestroy();
  };

  return provider;
}
