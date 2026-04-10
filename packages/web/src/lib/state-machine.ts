/**
 * Finite state machine with type-safe transitions, guards, and actions.
 */

// --- Types ---

export type StateId = string;
export type EventId = string;
export type GuardFn<C> = (context: C) => boolean;
export type ActionFn<C> = (context: C, event: EventId, payload?: unknown) => C | void;
export type TransitionTarget<State> = StateId | ((context: C) => StateId);

export interface TransitionConfig<C> {
  /** Target state (or function that returns target) */
  target: TransitionTarget<StateId>;
  /** Condition that must be true for transition to occur */
  guard?: GuardFn<C>;
  /** Action(s) to execute during transition */
  action?: ActionFn<C> | Array<ActionFn<C>>;
  /** Internal transition (doesn't exit/re-enter state) */
  internal?: boolean;
}

export interface StateConfig<C> {
  /** Actions to execute when entering this state */
  onEnter?: ActionFn<C> | Array<ActionFn<C>>;
  /** Actions to execute when exiting this state */
  onExit?: ActionFn<C> | Array<ActionFn<C>>;
  /** Transitions from this state keyed by event */
  on?: Record<EventId, TransitionConfig<C> | Array<TransitionConfig<C>>>;
  /** Is this a final state? */
  final?: boolean;
}

export interface MachineConfig<C> {
  /** Initial state */
  initial: StateId;
  /** State definitions */
  states: Record<StateId, StateConfig<C>>;
  /** Context (shared data) */
  context?: C;
  /** Actions available in all states (global transitions) */
  on?: Record<EventId, TransitionConfig<C> | Array<TransitionConfig<C>>>;
  /** Action to execute when machine is created */
  onCreate?: ActionFn<C>;
}

export interface MachineState<C> {
  current: StateId;
  previous: StateId | null;
  context: C;
  history: Array<{ from: StateId; to: StateId; event: EventId; timestamp: number }>;
  changed: boolean;
}

export type StateChangeListener<C> = (state: MachineState<C>) => void;
export type TransitionResult<C> = { success: boolean; state: MachineState<C> };

// --- Machine class ---

export class StateMachine<C extends Record<string, unknown> = Record<string, unknown>> {
  private config: MachineConfig<C>;
  private _current: StateId;
  private _previous: StateId | null = null;
  private _context: C;
  private history: MachineState<C>["history"] = [];
  private listeners = new Set<StateChangeListener<C>>();
  private _changed = false;

  constructor(config: MachineConfig<C>) {
    this.config = config;
    this._current = config.initial;
    this._context = (config.context ?? {}) as C;

    // Execute onEnter for initial state
    this.executeActions(this.config.states[this._current]?.onEnter);

    // Execute onCreate
    this.executeActions(config.onCreate);
  }

  /** Get current state info */
  get state(): MachineState<C> {
    return {
      current: this._current,
      previous: this._previous,
      context: { ...this._context },
      history: [...this.history],
      changed: this._changed,
    };
  }

  /** Get just the current state ID */
  get currentState(): StateId {
    return this._current;
  }

  /** Get context (mutable reference) */
  get context(): C {
    return this._context;
  }

  /** Send an event to trigger a transition */
  send(event: EventId, payload?: unknown): TransitionResult<C> {
    this._changed = false;

    // Try local transitions first
    const stateConfig = this.config.states[this._current];
    const transition = this.findTransition(stateConfig?.on?.[event], payload);

    // Then try global transitions
    const globalTransition = !transition
      ? this.findTransition(this.config.on?.[event], payload)
      : null;

    const targetTransition = transition ?? globalTransition;

    if (!targetTransition) {
      this.emit();
      return { success: false, state: this.state };
    }

    const targetState = typeof targetTransition.target === "function"
      ? (targetTransition.target as (ctx: C) => StateId)(this._context)
      : targetTransition.target;

    if (!targetState || !this.config.states[targetState]) {
      this.emit();
      return { success: false, state: this.state };
    }

    // Execute exit actions
    if (!targetTransition.internal) {
      this.executeActions(stateConfig?.onExit);
    }

    // Update state
    this._previous = this._current;
    this._current = targetState;
    this._changed = true;

    // Execute transition action
    this.executeActions(targetTransition.action);

    // Execute enter actions
    if (!targetTransition.internal) {
      this.executeActions(this.config.states[targetState]?.onEnter);
    }

    // Record history
    this.history.push({
      from: this._previous!,
      to: this._current,
      event,
      timestamp: Date.now(),
    });

    // Trim history to last 100 entries
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }

    this.emit();

    return { success: true, state: this.state };
  }

  /** Check if an event can be fired in current state */
  can(event: EventId): boolean {
    return !!(
      this.findTransition(this.config.states[this._current]?.on?.[event]) ??
      this.findTransition(this.config.on?.[event])
    );
  }

  /** Get all valid events from current state */
  getValidEvents(): EventId[] {
    const events: EventId[] = [];
    const stateEvents = Object.keys(this.config.states[this._current]?.on ?? {});
    const globalEvents = Object.keys(this.config.on ?? {});

    events.push(...stateEvents, ...globalEvents);
    return [...new Set(events)];
  }

  /** Check if machine is in a specific state */
  isIn(state: StateId): boolean {
    return this._current === state;
  }

  /** Check if machine is in a final state */
  isFinal(): boolean {
    return this.config.states[this._current]?.final === true;
  }

  /** Reset to initial state */
  reset(): void {
    this.executeActions(this.config.states[this._current]?.onExit);
    this._current = this.config.initial;
    this._previous = null;
    this._history = [];
    this._changed = true;
    this.executeActions(this.config.states[this._current]?.onEnter);
    this.emit();
  }

  /** Force-set state (use sparingly — bypasses guards and transitions) */
  forceSet(state: StateId): void {
    if (!this.config.states[state]) throw new Error(`Unknown state: ${state}`);
    this.executeActions(this.config.states[this._current]?.onExit);
    this._previous = this._current;
    this._current = state;
    this._changed = true;
    this.executeActions(this.config.states[state]?.onEnter);
    this.emit();
  }

  /** Subscribe to state changes */
  subscribe(listener: StateChangeListener<C>): () => void {
    this.listeners.add(listener);
    listener(this.state); // Emit immediately
    return () => this.listeners.delete(listener);
  }

  /** Get transition history */
  getHistory(): MachineState<C>["history"] {
    return [...this.history];
  }

  // --- Private ---

  private findTransition(
    config: TransitionConfig<C> | Array<TransitionConfig<C>> | undefined,
    payload?: unknown,
  ): TransitionConfig<C> | null {
    if (!config) return null;

    const transitions = Array.isArray(config) ? config : [config];

    for (const t of transitions) {
      if (t.guard && !t.guard(this._context)) continue;
      return t;
    }

    return null;
  }

  private executeActions(action: ActionFn<C> | Array<ActionFn<C> | undefined): void {
    if (!action) return;
    const actions = Array.isArray(action) ? action : [action];
    for (const fn of actions) {
      const result = fn(this._context, this._current, undefined);
      if (result !== undefined && typeof result === "object") {
        this._context = result;
      }
    }
  }

  private emit(): void {
    const snapshot = this.state;
    for (const listener of this.listeners) {
      try { listener(snapshot); } catch { /* ignore */ }
    }
  }
}

// --- Factory helpers ---

/** Create a simple toggle (on/off) state machine */
export function createToggle(initialOn = false): StateMachine<{ value: boolean }> {
  return new StateMachine({
    initial: initialOn ? "on" : "off",
    context: { value: initialOn },
    states: {
      off: {
        on: {
          TOGGLE: { target: "on", action: (ctx) => ({ ...ctx, value: true }) },
        },
      },
      on: {
        on: {
          TOGGLE: { target: "off", action: (ctx) => ({ ...ctx, value: false }) },
        },
        final: false,
      },
    },
  });
}

/** Create a loading/error/idle state machine */
export function createLoadingMachine(): StateMachine<{
  error: string | null;
  data: unknown;
}> {
  return new StateMachine({
    initial: "idle",
    context: { error: null, data: null },
    states: {
      idle: {
        on: {
          START: { target: "loading" },
        },
      },
      loading: {
        onEnter: (ctx) => ({ ...ctx, error: null }),
        on: {
          SUCCESS: { target: "success" },
          FAILURE: { target: "error" },
        },
      },
      success: {
        on: {
          START: { target: "loading" },
          RESET: { target: "idle" },
        },
        final: true,
      },
      error: {
        on: {
          RETRY: { target: "loading" },
          RESET: { target: "idle" },
        },
      },
    },
  });
}

/** Create a multi-step wizard state machine */
export function createWizardMachine(stepCount: number): StateMachine<{
  step: number;
  data: Record<string, unknown>;
  completed: boolean;
}> {
  const steps: Record<string, StateConfig<{ step: number; data: Record<string, unknown>; completed: boolean }>> = {
    completed: {
      final: true,
      on: { RESTART: { target: "step_1" } },
    },
  };

  for (let i = 1; i <= stepCount; i++) {
    const currentStep = `step_${i}`;
    const nextStep = i < stepCount ? `step_${i + 1}` : "completed";
    const prevStep = i > 1 ? `step_${i - 1}` : "step_1";

    steps[currentStep] = {
      onEnter: (ctx) => ({ ...ctx, step: i }),
      on: {
        NEXT: { target: nextStep },
        PREV: { target: prevStep, guard: (ctx) => ctx.step > 1 },
        FINISH: { target: "completed", guard: (_ctx) => i === stepCount },
      },
    };
  }

  return new StateMachine({
    initial: "step_1",
    context: { step: 1, data: {}, completed: false },
    states: steps,
  });
}
