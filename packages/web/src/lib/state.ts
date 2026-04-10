/**
 * State management utilities — lightweight stores for React and non-React contexts.
 */

import { Observable, type SubscriberFn } from "./observable";

/** Generic state container with history (undo/redo) support */
export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export class UndoableStore<T> {
  private _state: HistoryState<T>;
  private readonly observable: Observable<HistoryState<T>>;
  private maxHistory: number;

  constructor(initialState: T, maxHistory = 50) {
    this._state = { past: [], present: initialState, future: [] };
    this.observable = new Observable();
    this.maxHistory = maxHistory;
  }

  get present(): T {
    return this._state.present;
  }

  get canUndo(): boolean {
    return this._state.past.length > 0;
  }

  get canRedo(): boolean {
    return this._state.future.length > 0;
  }

  subscribe(fn: SubscriberFn<HistoryState<T>>) {
    return this.observable.subscribe(fn);
  }

  /** Update state and push current to history */
  dispatch(action: (current: T) => T): void {
    const newPresent = action(this._state.present);
    if (newPresent === this._state.present) return; // Reference equality

    this._state = {
      past: [...this._state.past.slice(-this.maxHistory + 1), this._state.present],
      present: newPresent,
      future: [],
    };

    this.observable.next(this._state);
  }

  /** Set state directly */
  set(value: T): void {
    this.dispatch(() => value);
  }

  undo(): T | null {
    if (!this.canUndo) return null;

    const previous = this._state.past[this._state.past.length - 1];
    const newPast = this._state.past.slice(0, -1);

    this._state = {
      past: newPast,
      present: previous,
      future: [this._state.present, ...this._state.future],
    };

    this.observable.next(this._state);
    return this._state.present;
  }

  redo(): T | null {
    if (!this.canRedo) return null;

    const next = this._state.future[0];

    this._state = {
      past: [...this._state.past, this._state.present],
      present: next,
      future: this._state.future.slice(1),
    };

    this.observable.next(this._state);
    return this._state.present;
  }

  clearHistory(): void {
    this._state.past = [];
    this._state.future = [];
    this.observable.next(this._state);
  }
}

/** Simple pub-sub event bus for cross-component communication */
export class EventBus<E extends Record<string, unknown> = Record<string, unknown>> {
  private listeners = new Map<keyof E, Set<SubscriberFn<unknown>>>();

  on<K extends keyof E>(event: K, fn: SubscriberFn<E[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn as SubscriberFn<unknown>);
    return () => { set?.delete(fn as SubscriberFn<unknown>); };
  }

  once<K extends keyof E>(event: K, fn: SubscriberFn<E[K]>): () => void {
    const unsubscribe = this.on(event, fn);
    // Wrap with auto-unsubscribe after first call
    const wrapped: SubscriberFn<unknown> = (...args) => {
      unsubscribe();
      (fn as SubscriberFn<unknown>)(...args);
    };
    // Replace the listener
    this.off(event, fn as SubscriberFn<unknown>);
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(wrapped);
    return unsubscribe;
  }

  off<K extends keyof E>(event: K, fn?: SubscriberFn<E[K]>): void {
    if (!fn) {
      this.listeners.delete(event);
      return;
    }
    this.listeners.get(event)?.delete(fn as SubscriberFn<unknown>);
  }

  emit<K extends keyof E>(event: K, data: E[K]): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    for (const fn of [...listeners]) {
      try { (fn as SubscriberFn<E[K]>)(data); } catch (err) {
        console.error(`[EventBus] Error in "${String(event)}" handler:`, err);
      }
    }
  }

  /** Remove all listeners */
  clear(): void {
    this.listeners.clear();
  }

  /** Get listener count for an event */
  listenerCount<K extends keyof E>(event: K): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

/** Global app event bus instance */
export const globalEvents = new EventBus<{
  "auth:login": { userId: string };
  "auth:logout": {};
  "notification:new": { id: string; type: string };
  "theme:change": { theme: "light" | "dark" | "system" };
  "pr:created": { prId: string };
  "pr:updated": { prId: string; status: string };
}>();
