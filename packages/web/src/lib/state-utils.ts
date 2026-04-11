/**
 * State Utilities: Reactive state container, state machines, derived state,
 * state history/undo-redo, persistence adapters, state diffing, and
 * pub/sub state change notification.
 */

// --- Types ---

export type StateListener<T> = (newState: T, prevState: T) => void;

export interface StateContainerOptions<T> {
  /** Initial state */
  initial: T;
  /** Called on every state change */
  onChange?: StateListener<T>;
  /** Middleware that can transform or reject state updates */
  middleware?: (next: T, current: T) => T | null;
  /** Enable undo history */
  undoHistory?: number; // Max undo steps (default 20)
  /** Persist state changes to storage */
  persistKey?: string;
  /** Batch multiple setState calls */
  batch?: boolean;
  /** Freeze state (Object.freeze) for immutability */
  freeze?: boolean;
}

export interface StateContainer<T> {
  /** Current state */
  getState: () => T;
  /** Set new state (merge or replace) */
  setState: (updater: Partial<T> | ((prev: T) => T)) => T;
  /** Replace entire state */
  replaceState: (newState: T) => T;
  /** Subscribe to changes */
  subscribe: (listener: StateListener<T>) => () => void;
  /** Undo last change */
  undo: () => T | null;
  /** Redo undone change */
  redo: () => T | null;
  /** Check if undo is available */
  canUndo: () => boolean;
  /** Check if redo is available */
  canRedo: () => boolean;
  /** Get undo history length */
  getHistoryLength: () => number;
  /** Clear history */
  clearHistory: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Simple State Container ---

/**
 * Create a reactive state container with optional undo/redo, persistence,
 * middleware, and subscription support.
 *
 * @example
 * ```ts
 * const store = createState({
 *   initial: { count: 0, name: "test" },
 *   onChange: (s) => console.log("Changed:", s),
 *   undoHistory: 10,
 * });
 * store.setState({ count: store.getState().count + 1 });
 * ```
 */
export function createState<T extends Record<string, unknown>>(options: StateContainerOptions<T>): StateContainer<T> {
  const {
    initial,
    onChange,
    middleware,
    undoHistory: maxUndo = 20,
    persistKey,
    freeze = false,
  } = options;

  let state: T = freeze ? Object.freeze({ ...initial }) : { ...initial };
  const listeners = new Set<StateListener<T>>();
  const past: T[] = [];
  const future: T[] = [];

  function getState(): T { return state; }

  function _notify(prev: T): void {
    for (const listener of listeners) {
      try { listener(state, prev); } catch { /* protect */ }
    }
    onChange?.(state, prev);

    if (persistKey) {
      try { localStorage.setItem(persistKey, JSON.stringify(state)); } catch { /* ignore */ }
    }
  }

  function setState(updater: Partial<T> | ((prev: T) => T)): T {
    const prevState = state;
    let next: T;

    if (typeof updater === "function") {
      next = (updater as (prev: T) => T)(prevState);
    } else {
      next = { ...prevState, ...updater };
    }

    // Apply middleware
    if (middleware) {
      const result = middleware(next, prevState);
      if (result === null) return prevState; // Middleware rejected
      next = result;
    }

    // Save to undo history
    if (maxUndo > 0) {
      past.push(prevState);
      if (past.length > maxUndo) past.shift();
      future.length = 0; // Clear redo on new action
    }

    state = freeze ? Object.freeze(next) : next;
    _notify(prevState);
    return state;
  }

  function replaceState(newState: T): T {
    const prevState = state;
    if (maxUndo > 0) {
      past.push(prevState);
      if (past.length > maxUndo) past.shift();
      future.length = 0;
    }
    state = freeze ? Object.freeze(newState) : newState;
    _notify(prevState);
    return state;
  }

  function subscribe(listener: StateListener<T>): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function undo(): T | null {
    if (past.length === 0) return null;
    const prev = state;
    future.unshift(state);
    state = past.pop()!;
    _notify(prev);
    return state;
  }

  function redo(): T | null {
    if (future.length === 0) return null;
    const prev = state;
    past.push(state);
    state = future.shift()!;
    _notify(prev);
    return state;
  }

  function canUndo(): boolean { return past.length > 0; }
  function canRedo(): boolean { return future.length > 0; }
  function getHistoryLength(): number { return past.length; }
  function clearHistory(): void { past.length = 0; future.length = 0; }
  function destroy(): void { listeners.clear(); }

  // Restore from persistence
  if (persistKey) {
    try {
      const saved = localStorage.getItem(persistKey);
      if (saved) {
        const parsed = JSON.parse(saved) as T;
        state = freeze ? Object.freeze(parsed) : parsed;
      }
    } catch { /* ignore corrupt data */ }
  }

  return { getState, setState, replaceState, subscribe, undo, redo, canUndo, canRedo, getHistoryLength, clearHistory, destroy };
}

// --- Derived State ---

/**
 * Create a computed/derived state that auto-updates when source state changes.
 *
 * @example
 * ```ts
 * const doubled = createDerived(store, (s) => s.count * 2);
 * console.log(doubled.getValue()); // Reactively updates
 * ```
 */
export function createDerived<S, T>(
  source: StateContainer<S>,
  compute: (state: S) => T,
): { getValue: () => T; subscribe: (listener: (val: T) => void) => () => void } {
  let currentValue = compute(source.getState());
  const listeners = new Set<(val: T) => void>();

  source.subscribe(() => {
    const newValue = compute(source.getState());
    if (newValue !== currentValue) {
      currentValue = newValue;
      for (const l of listeners) l(currentValue);
    }
  });

  return {
    getValue: () => currentValue,
    subscribe: (listener: (val: T) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// --- Simple State Machine ---

export type MachineState = string;
export type MachineEvent = string;

export interface MachineTransition {
  from: MachineState | "*";
  event: MachineEvent;
  to: MachineState;
  action?: (context: Record<string, unknown>) => void;
  guard?: (context: Record<string, unknown>) => boolean;
}

export interface MachineConfig {
  /** Initial state */
  initial: MachineState;
  /** States with optional onEnter/onExit callbacks */
  states?: Record<MachineState, {
    onEnter?: (ctx: Record<string, unknown>) => void;
    onExit?: (ctx: Record<string, unknown>) => void;
  }>;
  /** Transitions */
  transitions: MachineTransition[];
  /** Shared context object */
  context?: Record<string, unknown>;
  /** Called on every transition */
  onTransition?: (from: MachineState, to: MachineState, event: MachineEvent) => void;
}

export interface MachineInstance {
  /** Current state */
  currentState: MachineState;
  /** Send an event to trigger a transition */
  send: (event: MachineEvent, payload?: Record<string, unknown>) => boolean;
  /** Check if a state is the current state */
  is: (state: MachineState) => boolean;
  /** Subscribe to state changes */
  onChange: (listener: (state: MachineState) => void) => () => void;
  /** Get context */
  getContext: () => Record<string, unknown>;
  /** Destroy */
  destroy: () => void;
}

/**
 * Create a simple finite state machine.
 *
 * @example
 * ```ts
 * const machine = createMachine({
 *   initial: "idle",
 *   transitions: [
 *     { from: "idle", event: "FETCH", to: "loading" },
 *     { from: "loading", event: "SUCCESS", to: "success" },
 *     { from: "loading", event: "FAILURE", to: "error" },
 *     { from: "success", event: "FETCH", to: "loading" },
 *     { from: "error", event: "RETRY", to: "loading" },
 *     { from: "error", event: "RESET", to: "idle" },
 *     { from: "success", event: "RESET", to: "idle" },
 *   ],
 * });
 * machine.send("FETCH"); // → loading
 * machine.send("SUCCESS"); // → success
 * ```
 */
export function createMachine(config: MachineConfig): MachineInstance {
  let currentState: MachineState = config.initial;
  const ctx = config.context ?? {};
  const listeners = new Set<(state: MachineState) => void>();

  function send(event: MachineEvent, payload?: Record<string, unknown>): boolean {
    // Find matching transition
    const matching = config.transitions.filter(
      (t) => (t.from === "*" || t.from === currentState) && t.event === event,
    );

    for (const transition of matching) {
      // Check guard
      if (transition.guard && !transition.guard({ ...ctx, ...(payload ?? {}) })) continue;

      const prevState = currentState;
      const nextState = transition.to;

      // Exit current state
      config.states?.[currentState]?.onExit?.({ ...ctx, ...(payload ?? {}) });

      // Execute action
      transition.action?.({ ...ctx, ...(payload ?? {}) });

      // Enter new state
      currentState = nextState;
      config.states?.[currentState]?.onEnter?.({ ...ctx, ...(payload ?? {}) });

      config.onTransition?.(prevState, currentState, event);

      for (const l of listeners) l(currentState);
      return true;
    }

    return false; // No matching transition
  }

  function is(state: MachineState): boolean { return currentState === state; }

  function onChange(listener: (state: MachineState) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getContext(): Record<string, unknown> { return ctx; }

  function destroy(): void { listeners.clear(); }

  return { currentState, send, is, onChange, getContext, destroy };
}

// --- State Diffing ---

/**
 * Compute a shallow diff between two state objects.
 * Returns only changed keys with their old/new values.
 */
export function diffState<T extends Record<string, unknown>>(
  oldState: T,
  newState: T,
): { changed: string[]; added: string[]; removed: string[]; changes: Record<string, { from: unknown; to: unknown }> } {
  const changed: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  const allKeys = new Set([...Object.keys(oldState), ...Object.keys(newState)]);

  for (const key of allKeys) {
    const oldVal = oldState[key];
    const newVal = newState[key];

    if (oldVal === undefined && newVal !== undefined) {
      added.push(key);
      changes[key] = { from: undefined, to: newVal };
    } else if (oldVal !== undefined && newVal === undefined) {
      removed.push(key);
      changes[key] = { from: oldVal, to: undefined };
    } else if (oldVal !== newVal) {
      changed.push(key);
      changes[key] = { from: oldVal, to: newVal };
    }
  }

  return { changed, added, removed, changes };
}

/** Check if two states are deeply equal (shallow compare for primitives) */
export function statesEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]);
  }
  return false;
}
