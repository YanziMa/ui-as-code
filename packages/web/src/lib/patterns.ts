/**
 * Design pattern implementations — Singleton, Observer, Pub/Sub,
 * Strategy, Command, Mediator, State Machine, Iterator.
 */

// --- Singleton ---

/** Generic singleton factory */
export function createSingleton<T>(factory: () => T): () => T {
  let instance: T | null = null;
  return () => {
    if (!instance) instance = factory();
    return instance;
  };
}

// --- Observer ---

export interface Observer<T> {
  next(value: T): void;
  error?(err: unknown): void;
  complete?(): void;
}

export interface Subscription {
  unsubscribe(): void;
}

export interface ObservableLike<T> {
  subscribe(observer: Observer<T>): Subscription;
}

/** Simple Observable implementation */
export class Observable<T> implements ObservableLike<T> {
  private observers: Set<Observer<T>> = new Set();

  subscribe(observer: Observer<T>): Subscription {
    this.observers.add(observer);
    return {
      unsubscribe: () => { this.observers.delete(observer); },
    };
  }

  next(value: T): void {
    for (const obs of this.observers) obs.next(value);
  }

  error(err: unknown): void {
    for (const obs of this.observers) obs.error?.(err);
    this.observers.clear();
  }

  complete(): void {
    for (const obs of this.observers) obs.complete?.();
    this.observers.clear();
  }

  /** Transform values through a mapper */
  map<U>(mapper: (value: T) => U): Observable<U> {
    const output = new Observable<U>();
    this.subscribe({
      next: (v) => output.next(mapper(v)),
      error: (e) => output.error(e),
      complete: () => output.complete(),
    });
    return output;
  }

  /** Filter values by predicate */
  filter(predicate: (value: T) => boolean): Observable<T> {
    const output = new Observable<T>();
    this.subscribe({
      next: (v) => { if (predicate(v)) output.next(v); },
      error: (e) => output.error(e),
      complete: () => output.complete(),
    });
    return output;
  }

  /** Accumulate values with a reducer */
  scan<U>(reducer: (acc: U, value: T) => U, initial: U): Observable<U> {
    const output = new Observable<U>();
    let acc = initial;
    this.subscribe({
      next: (v) => { acc = reducer(acc, v); output.next(acc); },
      error: (e) => output.error(e),
      complete: () => output.complete(),
    });
    return output;
  }

  get observerCount(): number { return this.observers.size; }
}

// --- Pub/Sub ---

export type EventHandler<T = unknown> = (data: T) => void;

export class EventBus<EventMap extends Record<string, unknown> = Record<string, unknown>> {
  private listeners = new Map<string, Set<EventHandler>>();

  /** Subscribe to an event */
  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    const key = String(event);
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(handler as EventHandler);
    return () => this.off(event, handler as EventHandler);
  }

  /** Subscribe once */
  once<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    const wrapper: EventHandler = (data) => {
      handler(data as EventMap[K]);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  /** Unsubscribe from an event */
  off<K extends keyof EventMap>(event: K, handler: EventHandler): void {
    this.listeners.get(String(event))?.delete(handler);
  }

  /** Emit an event */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const handlers = this.listeners.get(String(event));
    if (handlers) {
      for (const h of handlers) h(data);
    }
  }

  /** Remove all listeners for an event (or all events) */
  clear(event?: keyof EventMap): void {
    if (event) this.listeners.delete(String(event));
    else this.listeners.clear();
  }

  /** Get listener count for an event */
  listenerCount(event: keyof EventMap): number {
    return this.listeners.get(String(event))?.size ?? 0;
  }
}

// --- Strategy ---

export interface StrategyContext<T> {
  execute(input: T): unknown;
  setStrategy(strategy: Strategy<T>): void;
}

export interface Strategy<T> {
  name: string;
  execute(input: T): unknown;
}

/** Generic strategy context */
export class StrategyRunner<T> implements StrategyContext<T> {
  private currentStrategy: Strategy<T>;

  constructor(initialStrategy: Strategy<T>) {
    this.currentStrategy = initialStrategy;
  }

  execute(input: T): unknown {
    return this.currentStrategy.execute(input);
  }

  setStrategy(strategy: Strategy<T>): void {
    this.currentStrategy = strategy;
  }

  get strategyName(): string { return this.currentStrategy.name; }
}

// --- Command ---

export interface Command {
  execute(): void;
  undo?(): void;
  canUndo?: () => boolean;
}

/** Command invoker with undo history */
export class CommandInvoker {
  private history: Command[] = [];
  private position = -1;

  execute(command: Command): void {
    // Redo branch is invalidated
    if (this.position < this.history.length - 1) {
      this.history = this.history.slice(0, this.position + 1);
    }

    command.execute();
    this.history.push(command);
    this.position++;
  }

  undo(): boolean {
    if (this.position < 0) return false;
    const command = this.history[this.position];
    if (command.canUndo?.() === false) return false;
    command.undo?.();
    this.position--;
    return true;
  }

  redo(): boolean {
    if (this.position >= this.history.length - 1) return false;
    this.position++;
    this.history[this.position]?.execute();
    return true;
  }

  canUndo(): boolean { return this.position >= 0 && (this.history[this.position]?.canUndo?.() !== false); }
  canRedo(): boolean { return this.position < this.history.length - 1; }
  clearHistory(): void { this.history = []; this.position = -1; }
}

// --- Mediator ---

export type MediatorHandler<T = unknown> = (payload: T, sender?: string) => void;

export class Mediator {
  private handlers = new Map<string, Set<{ handler: MediatorHandler; priority: number }>>();

  /** Register a handler for a message type */
  on(messageType: string, handler: MediatorHandler, priority = 0): () => void {
    if (!this.handlers.has(messageType)) this.handlers.set(messageType, new Set());
    this.handlers.get(messageType)!.add({ handler, priority });
    return () => this.off(messageType, handler);
  }

  /** Unregister a handler */
  off(messageType: string, handler: MediatorHandler): void {
    const handlers = this.handlers.get(messageType);
    if (handlers) {
      for (const entry of handlers) {
        if (entry.handler === handler) { handlers.delete(entry); break; }
      }
    }
  }

  /** Send a message (handlers called in priority order) */
  send<T>(messageType: string, payload: T, sender?: string): void {
    const handlers = this.handlers.get(messageType);
    if (!handlers) return;

    const sorted = [...handlers].sort((a, b) => b.priority - a.priority);
    for (const { handler } of sorted) handler(payload, sender);
  }

  /** Send and wait for first non-undefined response */
  request<T, R>(messageType: string, payload: T, sender?: string): R | undefined {
    let result: R | undefined;
    const handlers = this.handlers.get(messageType);
    if (!handlers) return undefined;

    const sorted = [...handlers].sort((a, b) => b.priority - a.priority);
    for (const { handler } of sorted) {
      const r = handler(payload, sender);
      if (r !== undefined) { result = r as R; break; }
    }
    return result;
  }
}

// --- State Machine ---

export interface StateTransition<S> {
  from: S;
  event: string;
  to: S;
  action?: () => void;
  guard?: () => boolean;
}

export interface StateMachineConfig<S> {
  initial: S;
  transitions: StateTransition<S>[];
  onTransition?: (from: S, to: S, event: string) => void;
}

export class FiniteStateMachine<S> {
  private currentState: S;
  private transitions: Map<string, StateTransition<S>[]>;
  private config: StateMachineConfig<S>;

  constructor(config: StateMachineConfig<S>) {
    this.config = config;
    this.currentState = config.initial;
    this.transitions = new Map();

    for (const t of config.transitions) {
      const key = `${t.from}:${t.event}`;
      if (!this.transitions.has(key)) this.transitions.set(key, []);
      this.transitions.get(key)!.push(t);
    }
  }

  get state(): S { return this.currentState; }

  canSend(event: string): boolean {
    const key = `${this.currentState}:${event}`;
    return this.transitions.has(key);
  }

  send(event: string): boolean {
    const key = `${this.currentState}:${event}`;
    const candidates = this.transitions.get(key);
    if (!candidates) return false;

    for (const transition of candidates) {
      if (transition.guard && !transition.guard()) continue;

      const previous = this.currentState;
      this.currentState = transition.to;
      transition.action?.();
      this.config.onTransition?.(previous, this.currentState, event);
      return true;
    }

    return false;
  }

  reset(): void {
    this.currentState = this.config.initial;
  }
}

// --- Iterator ---

/** Create an iterator from any iterable or array-like object */
export function createIterator<T>(collection: Iterable<T> | ArrayLike<T>): Iterator<T> {
  if (typeof (collection as Iterable<T>)[Symbol.iterator] === "function") {
    return (collection as Iterable<T>)[Symbol.iterator]();
  }
  // Fallback for array-like
  let idx = 0;
  const arr = collection as ArrayLike<T>;
  return {
    next(): IteratorResult<T> {
      if (idx >= arr.length) return { done: true, value: undefined as unknown as T };
      return { done: false, value: arr[idx++]! };
    },
  };
}

/** Range iterator (inclusive start, exclusive end) */
export function* range(start: number, end: number, step = 1): Generator<number> {
  for (let i = start; i < end; i += step) yield i;
}

/** Cycle through items infinitely */
export function* cycle<T>(items: T[]): Generator<T> {
  if (items.length === 0) return;
  while (true) yield* items;
}

/** Repeat a value N times */
export function* repeat<T>(value: T, count: number): Generator<T> {
  for (let i = 0; i < count; i++) yield value;
}

/** Take N items from an iterator */
export function* take<T>(iter: Iterator<T>, n: number): Generator<T> {
  for (let i = 0; i < n; i++) {
    const result = iter.next();
    if (result.done) break;
    yield result.value;
  }
}

/** Skip N items from an iterator */
export function* skip<T>(iter: Iterator<T>, n: number): Generator<T> {
  for (let i = 0; i < n; i++) {
    if (iter.next().done) return;
  }
  yield* iter;
}

/** Zip two iterators together */
export function* zipIterators<A, B>(a: Iterator<A>, b: Iterator<B>): Generator<[A, B]> {
  while (true) {
    const ra = a.next(), rb = b.next();
    if (ra.done || rb.done) break;
    yield [ra.value, rb.value];
  }
}
