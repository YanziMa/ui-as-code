/**
 * Component system — lightweight component model with lifecycle hooks,
 * props/state management, render function pattern, and composition utilities.
 * Designed to work standalone or integrate with the virtual-dom module.
 */

// --- Types ---

export interface ComponentProps {
  [key: string]: unknown;
  children?: ComponentNode[];
  key?: string | number;
  ref?: (el: Element | null) => void;
  className?: string;
  style?: Record<string, string | number>;
}

export interface ComponentState {
  [key: string]: unknown;
}

export type ComponentNode = {
  type: string | ComponentFunction;
  props: ComponentProps;
  key?: string | number;
};

export interface LifecycleHooks {
  /** Called before first render */
  onMount?(): void;
  /** Called after first render (DOM available) */
  onMounted?(el: Element): void;
  /** Called before update with new props */
  onUpdate?(newProps: ComponentProps): void;
  /** Called after update */
  onUpdated?(prevProps: ComponentProps): void;
  /** Called before unmount */
  onUnmount?(): void;
  /** Called when an error is thrown during render */
  onError?(error: Error, info: ErrorInfo): void;
}

export interface ErrorInfo {
  componentStack: string;
}

export interface ComponentInstance<P extends ComponentProps = ComponentProps> {
  /** Current props */
  props: P;
  /** Current state */
  state: ComponentState;
  /** Whether component is mounted */
  mounted: boolean;
  /** The root DOM element (after render) */
  el: Element | null;
  /** Set state and trigger re-render */
  setState: (partial: ComponentState | ((prev: ComponentState) => ComponentState), callback?: () => void) => void;
  /** Force re-render without state change */
  forceUpdate: (callback?: () => void) => void;
  /** Destroy the component instance */
  destroy: () => void;
  /** Get internal context */
  getContext: <T>(key: string) => T | undefined;
}

export type RenderFunction<P extends ComponentProps = ComponentProps> = (
  props: P,
) => ComponentNode | ComponentNode[] | string | null;

export type ComponentFunction<P extends ComponentProps = ComponentProps> = (
  props: P,
) => ComponentNode | ComponentNode[] | string | null;

// --- Base Component Class ---

/**
 * Base class for creating components with lifecycle management.
 * Extend this class to create reusable UI components.
 *
 * @example
 * ```ts
 * class Counter extends BaseComponent<{ initial?: number }> {
 *   state = { count: this.props.initial ?? 0 };
 *
 *   render() {
 *     return h('div', {}, [
 *       h('button', { onClick: () => this.setState({ count: this.state.count + 1 }) }, ['+']),
 *       h('span', {}, [String(this.state.count)]),
 *     ]);
 *   }
 * }
 * ```
 */
export class BaseComponent<P extends ComponentProps = ComponentProps>
  implements LifecycleHooks
{
  props: P;
  state: ComponentState = {};
  mounted = false;
  el: Element | null = null;
  private _destroyed = false;
  private _updateQueue: Array<() => void> = [];
  private _context = new Map<string, unknown>();
  private _subscribers = new Map<string, Set<() => void>>();

  constructor(props: P) {
    this.props = props;
  }

  // --- Lifecycle hooks (override in subclasses) ---

  onMount?(): void {}
  onMounted?(el: Element): void {}
  onUpdate?(newProps: P): void {}
  onUpdated?(prevProps: P): void {}
  onUnmount?(): void {}
  onError?(error: Error, info: ErrorInfo): void {}

  // --- State management ---

  setState(
    partial: ComponentState | ((prev: ComponentState) => ComponentState),
    callback?: () => void,
  ): void {
    if (this._destroyed) return;

    const newState =
      typeof partial === "function"
        ? (partial as (prev: ComponentState) => ComponentState)(this.state)
        : { ...this.state, ...partial };

    this.state = newState;

    if (this.mounted && !this._destroyed) {
      // Queue re-render
      this._updateQueue.push(() => {
        try {
          this._reRender();
          callback?.();
        } catch (err) {
          this._handleError(err);
        }
      });

      // Process queue synchronously (could be batched)
      this._flushUpdates();
    } else {
      callback?.();
    }
  }

  forceUpdate(callback?: () => void): void {
    if (this._destroyed || !this.mounted) return;

    this._updateQueue.push(() => {
      try {
        this._reRender();
        callback?.();
      } catch (err) {
        this._handleError(err);
      }
    });

    this._flushUpdates();
  }

  // --- Context ---

  setContext<T>(key: string, value: T): void {
    const prev = this._context.get(key);
    this._context.set(key, value);

    // Notify subscribers
    const subs = this._subscribers.get(key);
    if (subs) {
      for (const fn of subs) fn(value);
    }

    // If value changed and we're mounted, potentially re-render
    if (prev !== value && this.mounted) {
      this.forceUpdate();
    }
  }

  getContext<T>(key: string): T | undefined {
    return this._context.get(key) as T | undefined;
  }

  subscribeContext<T>(key: string, fn: (value: T) => void): () => void {
    let subs = this._subscribers.get(key);
    if (!subs) {
      subs = new Set();
      this._subscribers.set(key, subs);
    }
    subs.add(fn as () => void);

    // Call immediately with current value
    const val = this._context.get(key);
    if (val !== undefined) fn(val as T);

    return () => { subs!.delete(fn as () => void); };
  }

  // --- Destruction ---

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.onUnmount();

    // Clear subscribers
    this._subscribers.clear();
    this._context.clear();
    this._updateQueue.length = 0;

    // Remove DOM element
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this.el = null;
    this.mounted = false;
  }

  // --- Internal ---

  protected _reRender(): void {
    // This would call render() and patch the DOM.
    // In a full framework, this triggers the reconciliation pipeline.
    // For the base class, subclasses should override to provide actual rendering logic.
  }

  private _flushUpdates(): void {
    while (this._updateQueue.length > 0) {
      const fn = this._updateQueue.shift()!;
      fn();
    }
  }

  private _handleError(error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));
    const info: ErrorInfo = { componentStack: this.constructor.name };

    if (this.onError) {
      this.onError(err, info);
    } else {
      console.error(`[Component] ${this.constructor.name} error:`, err);
    }
  }
}

// --- Functional Component Helpers ---

/**
 * Create a functional component instance with managed state and lifecycle.
 * Returns an object mimicking the class-based ComponentInstance interface.
 */
export function createComponent<P extends ComponentProps>(
  renderFn: RenderFunction<P>,
  initialProps: P,
  options?: {
    initialState?: ComponentState;
    onMount?: () => void;
    onUnmount?: () => void;
  },
): ComponentInstance<P> {
  let state: ComponentState = options?.initialState ?? {};
  let mounted = false;
  let destroyed = false;
  let el: Element | null = null;
  const context = new Map<string, unknown>();
  const updateQueue: Array<() => void> = [];

  const instance: ComponentInstance<P> = {
    get props() { return initialProps; },
    get state() { return state; },
    get mounted() { return mounted; },
    get el() { return el; },

    setState(partial, callback) {
      if (destroyed) return;

      state =
        typeof partial === "function"
          ? (partial as (prev: ComponentState) => ComponentState)(state)
          : { ...state, ...partial };

      if (mounted) {
        updateQueue.push(() => {
          try {
            // Re-render would happen here
            callback?.();
          } catch (err) {
            console.error("[Component] setState error:", err);
          }
        });
        flushUpdates();
      }
    },

    forceUpdate(callback) {
      if (destroyed || !mounted) return;
      updateQueue.push(() => { callback?.(); });
      flushUpdates();
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      options?.onUnmount?.();
      context.clear();
      updateQueue.length = 0;
      if (el?.parentNode) el.parentNode.removeChild(el);
      el = null;
      mounted = false;
    },

    getContext: (key) => context.get(key) as any,
  };

  function flushUpdates(): void {
    while (updateQueue.length > 0) {
      const fn = updateQueue.shift()!;
      fn();
    }
  }

  // Initialize
  options?.onMount?.();
  mounted = true;

  return instance;
}

// --- Composition Utilities ---

/**
 * Wrap a component with additional props or behavior (HOC pattern).
 */
export function withProps<P extends ComponentProps, ExtraP extends Partial<P>>(
  WrappedComponent: ComponentFunction<P>,
  extraProps: ExtraP,
): ComponentFunction<Omit<P, keyof ExtraP> & ExtraP> {
  return (props) =>
    WrappedComponent({ ...props, ...extraProps } as P);
}

/**
 * Create a component that only renders when a condition is met.
 */
export function when<P extends ComponentProps>(
  condition: boolean | (() => boolean),
  component: ComponentFunction<P>,
  props: P,
): ComponentNode | null {
  const shouldRender = typeof condition === "function" ? condition() : condition;
  return shouldRender ? component(props) : null;
}

/**
 * Memoize a component's output based on props equality.
 * Skips re-render if props haven't changed.
 */
export function memoComponent<P extends ComponentProps>(
  component: ComponentFunction<P>,
  areEqual?: (prev: P, next: P) => boolean,
): ComponentFunction<P> {
  let lastProps: P | null = null;
  let lastResult: ReturnType<ComponentFunction<P>> | null = null;

  return (props: P) => {
    if (lastProps !== null && areEqual?.(lastProps, props)) {
      return lastResult!;
    }
    lastProps = props;
    lastResult = component(props);
    return lastResult;
  };
}

// --- Fragment ---

/** Fragment marker — renders children without a wrapper element */
export const Fragment = (props: { children?: ComponentNode[] }): ComponentNode[] =>
  props.children ?? [];
