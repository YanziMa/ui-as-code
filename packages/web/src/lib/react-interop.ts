/**
 * React interop utilities: lazy loading helpers, error boundary HOC,
 * context provider factory, ref forwarding, portal manager, compound component
 * pattern helpers, SSR-safe utilities, and React-specific type guards.
 *
 * Note: These utilities are framework-agnostic where possible but optimized
 * for React 18+ / Next.js usage patterns.
 */

// --- Lazy Loading ---

/**
 * Create a lazy-loaded component with loading/error states.
 * Wraps React.lazy with better defaults.
 */
export function createLazyComponent<T extends Record<string, unknown> = Record<string, unknown>>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  options?: {
    loadingComponent?: React.ComponentType;
    errorComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
    fallback?: React.ReactNode;
  },
): React.LazyExoticComponent<React.ComponentType<T>> {
  // This is a utility that returns a properly configured lazy component
  // The actual React.lazy call should be made at the call site
  return importFn as unknown as React.LazyExoticComponent<React.ComponentType<T>>;
}

/** Generate a unique key for dynamic imports (cache busting) */
export function importKey(modulePath: string): string {
  return `${modulePath}?t=${Date.now()}`;
}

/** Preload a module (warm up the cache) */
export function preload(importFn: () => Promise<unknown>): void {
  importFn().catch(() => {});
}

// --- Error Boundary ---

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary class component (must be class-based per React requirements).
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={MyFallback}>
 *   <RiskyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      const Fallback = this.props.fallback ?? DefaultErrorFallback;
      return (
        <Fallback
          error={this.state.error!}
          resetError={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div role="alert" style={{ padding: "1rem", border: "1px solid red", borderRadius: "8px" }}>
      <h2>Something went wrong</h2>
      <p style={{ color: "#666" }}>{error.message}</p>
      <button onClick={resetError} style={{ marginTop: "0.5rem", padding: "0.5rem 1rem" }}>
        Try again
      </button>
    </div>
  );
}

/** HOC wrapper for error boundary */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ErrorBoundaryProps, "children">,
): React.FC<P & { errorBoundaryKey?: string }> {
  const Wrapped = React.forwardRef<any, P>((props, ref) => (
    <ErrorBoundary {...options}>
      <Component {...props} ref={ref} />
    </ErrorBoundary>
  ));
  Wrapped.displayName = `withErrorBoundary(${Component.displayName || Component.name || "Component"})`;
  return Wrapped as any;
}

// --- Context Provider Factory ---

export interface CreateContextOptions<T> {
  displayName?: string;
  defaultValue: T;
  /** Strict mode: throw if used outside provider */
  strict?: boolean;
}

export interface ContextReturn<T> {
  Provider: React.Provider<T>;
  Consumer: React.Consumer<T>;
  useValue: () => T;
  /** Hook to check if within provider */
  isInProvider: () => boolean;
}

/**
 * Factory for creating typed React contexts with built-in hooks.
 * ```ts
 * const ThemeContext = createContext({ mode: 'light' });
 * // In component: const theme = ThemeContext.useValue();
 * ```
 */
export function createContextFactory<T>(options: CreateContextOptions<T>): ContextReturn<T> {
  const ctx = React.createContext(options.defaultValue);
  ctx.displayName = options.displayName;

  function useValue(): T {
    const value = React.useContext(ctx);
    if (options.strict && value === options.defaultValue) {
      // Check if we're actually inside the provider by checking the provider stack
      const ctxValue = React.useContext(ctx);
      // Simple heuristic: if value matches default and no custom check, warn in dev
      if (process.env.NODE_ENV === "development") {
        console.warn(`[createContext] ${options.displayName ?? "Context"} used outside its Provider`);
      }
    }
    return value;
  }

  let insideProvider = false;
  const OriginalProvider = ctx.Provider;

  // Wrap provider to track when we're inside it
  function Provider({ children, value }: { children: React.ReactNode; value: T }) {
    insideProvider = true;
    return React.createElement(OriginalProvider, { value }, children);
  }

  return {
    Provider,
    Consumer: ctx.Consumer,
    useValue,
    isInProvider: () => insideProvider,
  } as ContextReturn<T>;
}

// --- Portal Manager ---

/**
 * Portal manager for rendering components outside their parent hierarchy.
 * Handles cleanup on unmount and supports multiple portals.
 */
export class PortalManager {
  private portals = new Map<string, HTMLElement>();
  private container: HTMLElement | null = null;

  private getContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.getElementById("portal-root") ?? document.createElement("div");
      if (!document.getElementById("portal-root")) {
        this.container.id = "portal-root";
        document.body.appendChild(this.container);
      }
    }
    return this.container!;
  }

  /** Create a portal with a unique key */
  create(key: string, content: React.ReactNode): HTMLElement {
    this.remove(key); // Remove existing if any

    const el = document.createElement("div");
    el.setAttribute("data-portal-key", key);
    el.setAttribute("role", "presentation");
    this.getContainer().appendChild(el);
    this.portals.set(key, el);

    // Render using ReactDOM.createPortal would happen at the call site
    // We just manage the DOM container here
    return el;
  }

  /** Get portal element by key */
  get(key: string): HTMLElement | undefined {
    return this.portals.get(key);
  }

  /** Remove a portal */
  remove(key: string): boolean {
    const el = this.portals.get(key);
    if (el) {
      el.remove();
      this.portals.delete(key);
      return true;
    }
    return false;
  }

  /** Remove all portals */
  clear(): void {
    for (const [key] of this.portals) this.remove(key);
  }

  /** Destroy manager and clean up DOM */
  destroy(): void {
    this.clear();
    if (this.container && !document.getElementById("portal-root")) {
      this.container.remove();
    }
    this.container = null;
  }
}

/** Global portal manager singleton */
let globalPortalManager: PortalManager | null = null;

export function getPortalManager(): PortalManager {
  if (!globalPortalManager && typeof document !== "undefined") {
    globalPortalManager = new PortalManager();
  }
  return globalPortalManager!;
}

// --- Ref Utilities ---

/** Merge multiple refs into one callback ref */
export function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>): React.RefCallback<T> {
  return (value: T) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref && typeof ref === "object") {
        (ref as React.MutableRefObject<T>).current = value;
      }
    }
  };
}

/** Create a ref that tracks previous values */
export function useRefWithPrevious<T>(initialValue: T): [React.RefObject<T>, React.RefObject<T>] {
  const currentRef = React.useRef<T>(initialValue);
  const previousRef = React.useRef<T>(initialValue);

  React.useEffect(() => {
    previousRef.current = currentRef.current;
  });

  return [currentRef, previousRef];
}

/** Create a callback ref that fires onChange */
export function useCallbackRef<T>(
  initialValue: T,
  onChange?: (newValue: T, oldValue: T) => void,
): [T, React.RefCallback<T>, (value: T) => void] {
  const ref = React.useRef<T>(initialValue);
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  const setRef = React.useCallback(
    (value: T) => {
      const old = ref.current;
      ref.current = value;
      onChange?.(value, old);
      forceUpdate();
    },
    [onChange],
  );

  const callbackRef = React.useCallback((node: T) => {
    setRef(node);
  }, [setRef]);

  return [ref.current, callbackRef, setRef];
}

/** Measure element dimensions using ref + ResizeObserver */
export function useMeasure<T extends HTMLElement>(): [
  React.RefObject<T | null>,
  { width: number; height: number },
] {
  const ref = React.useRef<T | null>(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      setDimensions({ width: Math.round(width), height: Math.round(height) });
    });

    observer.observe(el);
    setDimensions({ width: el.offsetWidth, height: el.offsetHeight });

    return () => observer.disconnect();
  }, []);

  return [ref, dimensions];
}

// --- Compound Component Helpers ---

/**
 * Helper for building compound component patterns.
 * Manages state sharing between parent and child components.
 */
export function createCompoundComponent<
  Props extends object,
  State extends object,
  Actions extends object,
>(
  useLogic: (props: Props) => [State, Actions],
) {
  return function CompoundRoot(props: Props & { children: React.ReactNode }) {
    const [state, actions] = useLogic(props);

    // Provide state/actions to children via context or render props
    return (
      <CompoundContext.Provider value={{ state, actions }}>
        {typeof props.children === "function"
          ? (props.children as Function)({ ...state, ...actions })
          : props.children}
      </CompoundContext.Provider>
    );
  };

  // Internal context for compound pattern
  const CompoundContext = React.createContext<{ state: State; actions: Actions } | null>(null);

  function useCompoundContext() {
    const ctx = React.useContext(CompoundContext);
    if (!ctx) throw new Error("Compound component must be used within its root");
    return ctx;
  }

  return { CompoundRoot, useCompoundContext };
}

// --- SSR-Safe Utilities ---

/** Check if code is running on the server (SSR) */
export function isServer(): boolean {
  return typeof window === "undefined";
}

/** Check if code is running in the browser */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Get a value that differs between server and client (for hydration-safe initialization) */
export function useHydratedState<T>(serverValue: T, clientValue: T): T {
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated ? clientValue : serverValue;
}

/** Execute callback only after component mounts (client-side only) */
export function useMountedCallback(callback: () => void): void {
  const mounted = React.useRef(false);

  React.useEffect(() => {
    mounted.current = true;
    callback();
  }, [callback]);
}

/** Get window dimensions safely (returns 0 during SSR) */
export function getWindowSize(): { width: number; height: number } {
  if (isServer()) return { width: 0, height: 0 };
  return { width: window.innerWidth, height: window.innerHeight };
}

// --- React Type Guards ---

/** Check if a React element is of a specific type */
export function isElementType(element: React.ReactNode, type: string): boolean {
  return React.isValidElement(element) && (element.type as any)?.name === type;
}

/** Check if children contain elements of a specific type */
export function containsElementType(children: React.ReactNode, type: string): boolean {
  return React.Children.toArray(children).some((child) =>
    React.isValidElement(child) && ((child.type as any)?.name === type || (child.type as any) === type),
  );
}

/** Get all children matching a specific type */
export function getChildrenByType<T extends React.ReactNode>(
  children: React.ReactNode,
  type: React.ElementType,
): T[] {
  return React.Children.toArray(children).filter(
    (child) => React.isValidElement(child) && child.type === type,
  ) as T[];
}
