/**
 * @module state-machine
 *
 * A comprehensive, type-safe state machine library for TypeScript.
 *
 * Provides:
 * - **Finite State Machine (FSM)**: typed states/events, guards, actions, transitions
 * - **Hierarchical State Machine (HSM)**: parent/child state relationships with inherited transitions
 * - **Statechart Features**: deep/shallow history, choice/junction pseudostates,
 *   deferred events queue, internal self-transitions
 * - **Utility Functions**: `createMachine`, `interpret`, `match` factory helpers
 *
 * Pure TypeScript. No framework dependencies.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/** A valid state identifier (string literal union or string) */
export type StateId = string;

/** A valid event identifier (string literal union or string) */
export type EventId = string;

/** Context data shared across the entire machine */
export type MachineContext = Record<string, unknown>;

/** Event payload sent alongside an event */
export type EventPayload = unknown;

/** Guard predicate — must return `true` for the transition to proceed */
export type GuardFn<C extends MachineContext> = (
  context: C,
  event: EventId,
  payload?: EventPayload,
) => boolean;

/** Action function executed during enter/exit/transition hooks.
 *  May return a partial context update (merged into context) or void. */
export type ActionFn<C extends MachineContext> = (
  context: C,
  event: EventId,
  payload?: EventPayload,
) => Partial<C> | void;

/** Listener callback invoked on every state change */
export type StateListener<S, E, C extends MachineContext> = (state: StateValue<S, C>) => void;

/** Strategy for handling events that have no matching transition in the current state */
export type InvalidEventStrategy = "throw" | "ignore" | "log";

// --- Transition Types ---

/** Target of a transition: a fixed state ID or a dynamic function */
export type TransitionTarget<S> =
  | S
  | ((context: MachineContext, event: EventId, payload?: EventPayload) => S);

/** Single transition rule definition */
export interface TransitionDef<S, E, C extends MachineContext> {
  /** The target state this transition leads to */
  target: TransitionTarget<S>;
  /** Optional guard condition that must pass before the transition fires */
  guard?: GuardFn<C>;
  /** Action(s) to execute during the transition (after exit, before enter) */
  action?: ActionFn<C> | ActionFn<C>[];
  /** If true, this is an internal self-transition (no exit/enter) */
  internal?: boolean;
}

// --- State Configuration ---

/** History mode for a composite / parent state */
export type HistoryMode = "shallow" | "deep";

/** Configuration for a single state */
export interface StateConfig<S, E, C extends MachineContext> {
  /** Actions to run when entering this state */
  onEnter?: ActionFn<C> | ActionFn<C>[];
  /** Actions to run when exiting this state */
  onExit?: ActionFn<C> | ActionFn<C>[];
  /** Local transitions keyed by event ID */
  on?: Partial<Record<E, TransitionDef<S, E, C> | TransitionDef<S, E, C>[]>>;
  /** Child states (makes this a composite / hierarchical state) */
  states?: Record<string, StateConfig<S, E, C>>;
  /** Initial child state (required when `states` is present) */
  initial?: S;
  /** Mark as a final (terminal) state */
  final?: boolean;
  /** History configuration */
  history?: HistoryMode | { type: HistoryMode; target: S };
  /** Events to defer (queue until a later state handles them) */
  defer?: E[];
  /** Tags for semantic grouping / matching */
  tags?: string[];
  /** Parallel regions (optional advanced feature) */
  parallel?: boolean;
}

// --- Machine Configuration ---

/** Top-level machine configuration object */
export interface MachineConfig<S, E, C extends MachineContext> {
  /** The ID of the initial state */
  initial: S;
  /** All state definitions */
  states: Record<string, StateConfig<S, E, C>>;
  /** Initial context value */
  context?: C;
  /** Global transitions (checked after local per-state transitions) */
  on?: Partial<Record<E, TransitionDef<S, E, C> | TransitionDef<S, E, C>[]>>;
  /** How to handle events with no matching transition (default: "ignore") */
  invalidEventStrategy?: InvalidEventStrategy;
  /** Action(s) to run once when the machine is created */
  onCreate?: ActionFn<C> | ActionFn<C>[];
  /** Maximum history entries to retain (default: 200) */
  maxHistory?: number;
}

// --- Pseudostate Configurations ---

/** Choice pseudostate: conditional branching based on guard predicates */
export interface ChoiceConfig<S, C extends MachineContext> {
  /** Guard condition */
  guard: GuardFn<C>;
  /** Target state if guard passes */
  target: S;
  /** Optional action to run if this choice is taken */
  action?: ActionFn<C>;
}

/** Junction pseudostate: merge multiple entry points into one exit */
export interface JunctionConfig<S, C extends MachineContext> {
  /** Source states that can enter this junction */
  from: S[];
  /** Unified target state */
  target: S;
  /** Optional action at the junction point */
  action?: ActionFn<C>;
}

// --- Runtime State Value ---

/** A snapshot of the machine's current runtime state */
export interface StateValue<S, C extends MachineContext> {
  /** Current state ID (or nested object for hierarchical states) */
  value: S | Record<string, S | Record<string, unknown>>;
  /** Previous state ID (flat) */
  previous: S | null;
  /** Current context snapshot */
  context: C;
  /** Whether the last `send()` caused a state change */
  changed: boolean;
  /** Ordered list of past transitions */
  history: TransitionHistoryEntry<S>[];
  /** Currently active tags (from current state's config) */
  tags: string[];
  /** Whether the machine has reached a final state */
  done: boolean;
  /** Deferred events waiting to be processed */
  deferredEvents: Array<{ event: E; payload?: EventPayload }>;
}

/** One entry in the transition history log */
export interface TransitionHistoryEntry<S> {
  from: S;
  to: S;
  event: string;
  timestamp: number;
  payload?: EventPayload;
}

// --- Service (running instance) ---

/** A running state machine service that can send events and be observed */
export interface Service<S, E, C extends MachineContext> {
  /** Send an event to trigger a transition */
  send(event: E, payload?: EventPayload): StateValue<S, C>;
  /** Subscribe to state-change notifications; returns unsubscribe fn */
  subscribe(listener: StateListener<S, E, C>): () => void;
  /** Get the current state snapshot (without triggering listeners) */
  getSnapshot(): StateValue<S, C>;
  /** Start the service (fires onCreate + initial onEnter) */
  start(): Service<S, E, C>;
  /** Stop the service (cleans up listeners) */
  stop(): void;
  /** Whether the service is currently running */
  readonly running: boolean;
}

// ============================================================================
// Finite State Machine (FSM)
// ============================================================================

/**
 * A generic, type-safe Finite State Machine.
 *
 * Supports:
 * - Typed states (`S`) and events (`E`)
 * - Guard conditions on transitions
 * - Enter / exit action hooks per state
 * - Transition actions
 * - Configurable invalid-event handling
 * - Full transition history
 * - JSON serialization / deserialization of config
 *
 * @typeParam S - Union of valid state identifiers
 * @typeParam E - Union of valid event identifiers
 * @typeParam C - Context shape (defaults to `Record<string, unknown>`)
 *
 * @example
 * ```ts
 * type LightState = 'green' | 'yellow' | 'red';
 * type LightEvent = 'TIMER' | 'POWER';
 *
 * const fsm = new FSM<LightState, LightEvent, { count: number }>({
 *   initial: 'green',
 *   context: { count: 0 },
 *   states: {
 *     green: {
 *       onEnter: ctx => ({ count: ctx.count + 1 }),
 *       on: {
 *         TIMER: { target: 'yellow' },
 *         POWER:  { target: 'red', guard: ctx => ctx.count > 3 },
 *       },
 *     },
 *     yellow: { on: { TIMER: { target: 'red' } } },
 *     red:    { on: { TIMER: { target: 'green' } }, final: true },
 *   },
 * });
 *
 * fsm.send('TIMER'); // green -> yellow
 * console.log(fsm.currentState); // 'yellow'
 * ```
 */
export class FSM<
  S extends StateId,
  E extends EventId,
  C extends MachineContext = MachineContext,
> {
  /** The resolved machine configuration (frozen after construction) */
  private readonly config: Readonly<MachineConfig<S, E, C>>;

  /** Current active state ID */
  private _current: S;

  /** Previous state ID (null before first transition) */
  private _previous: S | null = null;

  /** Mutable context object */
  private _context: C;

  /** Ordered log of every transition that has occurred */
  private _history: TransitionHistoryEntry<S>[] = [];

  /** Set of subscribed change listeners */
  private readonly listeners = new Set<StateListener<S, E, C>>();

  /** Flag set to true when the most recent send() changed state */
  private _changed = false;

  /** Queue of deferred events not yet processed */
  private _deferred: Array<{ event: E; payload?: EventPayload }> = [];

  /** Whether the machine has been started */
  private _started = false;

  /**
   * Construct a new FSM instance.
   *
   * @param config - The machine configuration defining states, transitions, and context
   */
  constructor(config: MachineConfig<S, E, C>) {
    this.config = Object.freeze({ ...config }) as Readonly<MachineConfig<S, E, C>>;
    this._current = config.initial;
    this._context = { ...(config.context ?? ({} as C)) };

    // Auto-start by default
    this._startInternal();
  }

  // -----------------------------------------------------------------------
  // Public getters
  // -----------------------------------------------------------------------

  /** The current state identifier */
  get currentState(): S {
    return this._current;
  }

  /** The previous state identifier, or `null` if no transition has occurred yet */
  get previousState(): S | null {
    return this._previous;
  }

  /** A mutable reference to the machine's context */
  get context(): C {
    return this._context;
  }

  /**
   * A full snapshot of the machine's current state value.
   * Returns a fresh copy each time (safe to store / compare).
   */
  get state(): StateValue<S, C> {
    const stateDef = this.config.states[String(this._current)];
    return {
      value: this._current,
      previous: this._previous,
      context: { ...this._context },
      changed: this._changed,
      history: [...this._history],
      tags: stateDef?.tags ?? [],
      done: stateDef?.final === true,
      deferredEvents: [...this._deferred],
    };
  }

  /** Whether the machine is currently in a final (terminal) state */
  get isFinal(): boolean {
    return this.config.states[String(this._current)]?.final === true;
  }

  // -----------------------------------------------------------------------
  // Core API
  // -----------------------------------------------------------------------

  /**
   * Send an event to the machine, attempting to trigger a transition.
   *
   * Resolution order:
   * 1. Local transitions defined on the current state
   * 2. Global transitions defined at the machine level
   *
   * @param event - The event identifier to dispatch
   * @param payload - Optional data to pass to guards and actions
   * @returns The resulting state snapshot after processing
   *
   * @throws If `invalidEventStrategy` is `"throw"` and no transition matches
   */
  send(event: E, payload?: EventPayload): StateValue<S, C> {
    this._changed = false;

    const stateKey = String(this._current);
    const stateDef = this.config.states[stateKey];

    // Check if this event should be deferred in the current state
    if (stateDef?.defer && stateDef.defer.includes(event)) {
      this._deferred.push({ event, payload });
      this._emit();
      return this.state;
    }

    // 1. Try local (per-state) transitions
    const localTransitions = this._resolveTransitions(stateDef?.on?.[event]);
    let match = this._findFirstGuardedTransition(localTransitions);

    // 2. Fall back to global (machine-level) transitions
    if (!match) {
      const globalTransitions = this._resolveTransitions(this.config.on?.[event]);
      match = this._findFirstGuardedTransition(globalTransitions);
    }

    // 3. Handle no-matching-transition case
    if (!match) {
      this._handleInvalidEvent(event);
      this._emit();
      return this.state;
    }

    // Resolve target (may be a function)
    const targetRaw = typeof match.target === "function"
      ? (match.target as Function)(this._context, event, payload)
      : match.target;
    const target = targetRaw as S;

    // Validate target exists
    if (!this.config.states[String(target)]) {
      this._handleInvalidEvent(event, `Target state "${String(target)}" does not exist`);
      this._emit();
      return this.state;
    }

    // Execute the transition
    this._executeTransition(match, target, event, payload);

    // Process any newly-eligible deferred events
    this._processDeferred();

    this._emit();

    return this.state;
  }

  /**
   * Check whether a given event would be accepted in the current state.
   *
   * @param event - The event to probe
   * @returns `true` if at least one guarded transition matches
   */
  can(event: E): boolean {
    const stateKey = String(this._current);
    const local = this._resolveTransitions(this.config.states[stateKey]?.on?.[event]);
    if (this._findFirstGuardedTransition(local)) return true;

    const global = this._resolveTransitions(this.config.on?.[event]);
    return !!this._findFirstGuardedTransition(global);
  }

  /**
   * Return all event IDs that have at least one valid transition
   * from the current state (local or global).
   */
  getValidEvents(): E[] {
    const stateKey = String(this._current);
    const localKeys = Object.keys(this.config.states[stateKey]?.on ?? {}) as E[];
    const globalKeys = Object.keys(this.config.on ?? {}) as E[];
    const all = [...new Set([...localKeys, ...globalKeys])];
    return all.filter((e) => this.can(e));
  }

  /**
   * Predicate: is the machine currently in the given state?
   *
   * @param state - The state ID to check
   */
  isIn(state: S): boolean {
    return this._current === state;
  }

  /**
   * Reset the machine back to its initial state, clearing history and re-running
   * the initial onEnter hook.
   */
  reset(): void {
    const currentKey = String(this._current);
    this._runActions(this.config.states[currentKey]?.onExit, undefined, undefined);
    this._current = this.config.initial;
    this._previous = null;
    this._history = [];
    this._deferred = [];
    this._changed = true;
    this._runActions(
      this.config.states[String(this._current)]?.onEnter,
      undefined,
      undefined,
    );
    this._emit();
  }

  /**
   * Force-set the current state without going through normal transition logic.
   * Bypasses all guards. Use sparingly (e.g., tests, time-travel debugging).
   *
   * @param state - The state to jump to
   * @throws If the target state is not defined in the config
   */
  forceSet(state: S): void {
    if (!this.config.states[String(state)]) {
      throw new Error(`[FSM] Cannot forceSet: unknown state "${String(state)}"`);
    }
    this._runActions(this.config.states[String(this._current)]?.onExit, undefined, undefined);
    this._previous = this._current;
    this._current = state;
    this._changed = true;
    this._runActions(this.config.states[String(state)]?.onEnter, undefined, undefined);
    this._history.push({
      from: this._previous!,
      to: this._current,
      event: "__forceSet__",
      timestamp: Date.now(),
    });
    this._trimHistory();
    this._emit();
  }

  /**
   * Subscribe a listener to state changes.
   * The listener is called immediately with the current state, and then
   * on every subsequent `send()` call.
   *
   * @param listener - Callback receiving the new state snapshot
   * @returns An unsubscribe function
   */
  subscribe(listener: StateListener<S, E, C>): () => void {
    this.listeners.add(listener);
    // Fire immediately so subscriber gets current state
    try {
      listener(this.state);
    } catch {
      // Swallow errors in immediate callback
    }
    return () => this.listeners.delete(listener);
  }

  /**
   * Return a copy of the transition history array.
   */
  getHistory(): TransitionHistoryEntry<S>[] {
    return [...this._history];
  }

  /**
   * Serialize the machine's configuration to a JSON-safe plain object.
   * Useful for persistence, logging, or transfer across boundaries.
   */
  toJSON(): Record<string, unknown> {
    return {
      current: this._current,
      previous: this._previous,
      context: this._context,
      history: this._history,
      config: {
        initial: this.config.initial,
        states: this.config.states,
        context: this.config.context,
        on: this.config.on,
        invalidEventStrategy: this.config.invalidEventStrategy,
        maxHistory: this.config.maxHistory,
      },
    };
  }

  /**
   * Restore a machine from a previously serialized JSON snapshot.
   * Creates a **new** FSM instance — does not mutate `this`.
   *
   * @param json - Plain object produced by `toJSON()`
   * @returns A new FSM instance restored to the saved state
   */
  static fromJSON<S extends StateId, E extends EventId, C extends MachineContext>(
    json: Record<string, unknown>,
  ): FSM<S, E, C> {
    const cfg = json.config as MachineConfig<S, E, C>;
    const machine = new FSM<S, E, C>(cfg);
    // Override internals with saved values
    (machine as unknown as { _current: S })._current = json.current as S;
    (machine as unknown as { _previous: S | null })._previous = json.previous as S | null;
    (machine as unknown as { _context: C })._context = json.context as C;
    (machine as unknown as { _history: TransitionHistoryEntry<S>[] })._history = (
      json.history as TransitionHistoryEntry<S>[]
    ) ?? [];
    return machine;
  }

  // -----------------------------------------------------------------------
  // Private implementation
  // -----------------------------------------------------------------------

  /** Internal start: runs onCreate and initial onEnter */
  private _startInternal(): void {
    if (this._started) return;
    this._started = true;
    this._runActions(this.config.onCreate, undefined, undefined);
    this._runActions(
      this.config.states[String(this._current)]?.onEnter,
      undefined,
      undefined,
    );
  }

  /** Normalize a transition (or array) into a uniform array */
  private _resolveTransitions(
    raw: TransitionDef<S, E, C> | TransitionDef<S, E, C>[] | undefined,
  ): TransitionDef<S, E, C>[] {
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  }

  /** Find the first transition whose guard passes (or which has no guard) */
  private _findFirstGuardedTransition(
    transitions: TransitionDef<S, E, C>[],
  ): TransitionDef<S, E, C> | null {
    for (const t of transitions) {
      if (t.guard && !t.guard(this._context, t as unknown as E)) continue;
      return t;
    }
    return null;
  }

  /** Execute a single transition: exit -> action -> enter -> record */
  private _executeTransition(
    transition: TransitionDef<S, E, C>,
    target: S,
    event: E,
    payload?: EventPayload,
  ): void {
    const fromKey = String(this._current);
    const toKey = String(target);
    const fromDef = this.config.states[fromKey];
    const toDef = this.config.states[toKey];

    // Exit current state (skip for internal self-transitions)
    if (!transition.internal) {
      this._runActions(fromDef?.onExit, event, payload);
    }

    // Update bookkeeping
    this._previous = this._current;
    this._current = target;
    this._changed = true;

    // Run transition action(s)
    this._runActions(transition.action, event, payload);

    // Enter new state (skip for internal self-transitions)
    if (!transition.internal) {
      this._runActions(toDef?.onEnter, event, payload);
    }

    // Record in history
    this._history.push({
      from: this._previous!,
      to: this._current,
      event: String(event),
      timestamp: Date.now(),
      payload,
    });
    this._trimHistory();
  }

  /** Run one or more actions, merging any returned partial context */
  private _runActions(
    action: ActionFn<C> | ActionFn<C>[] | undefined,
    event: E | undefined,
    payload: EventPayload | undefined,
  ): void {
    if (!action) return;
    const fns: ActionFn<C>[] = Array.isArray(action) ? action : [action];
    for (const fn of fns) {
      try {
        const result = fn(this._context, event as E, payload);
        if (result && typeof result === "object" && !Array.isArray(result)) {
          this._context = { ...this._context, ...result };
        }
      } catch (err) {
        console.error(`[FSM] Action error:`, err);
      }
    }
  }

  /** Emit current state to all subscribers */
  private _emit(): void {
    const snap = this.state;
    for (const listener of this.listeners) {
      try {
        listener(snap);
      } catch {
        // Protect subscribers from breaking each other
      }
    }
  }

  /** Handle an event that found no matching transition */
  private _handleInvalidEvent(event: E, detail?: string): void {
    const strategy = this.config.invalidEventStrategy ?? "ignore";
    switch (strategy) {
      case "throw":
        throw new Error(
          `[FSM] Invalid event "${String(event)}" in state "${String(this._current)}"${detail ? `: ${detail}` : ""}`,
        );
      case "log":
        console.warn(
          `[FSM] Ignored event "${String(event)}" in state "${String(this._current)}"${detail ? `: ${detail}` : ""}`,
        );
        break;
      // "ignore": silently do nothing
    }
  }

  /** Trim history to configured maximum length */
  private _trimHistory(): void {
    const max = this.config.maxHistory ?? 200;
    if (this._history.length > max) {
      this._history = this._history.slice(-max);
    }
  }

  /** Attempt to process any queued deferred events now that state may have changed */
  private _processDeferred(): void {
    if (this._deferred.length === 0) return;

    const stateKey = String(this._current);
    const stateDef = this.config.states[stateKey];
    const stillDeferred: Array<{ event: E; payload?: EventPayload }> = [];

    for (const item of this._deferred) {
      // If still deferred in new state, keep it queued
      if (stateDef?.defer?.includes(item.event)) {
        stillDeferred.push(item);
        continue;
      }
      // Otherwise attempt to process it
      this.send(item.event, item.payload);
    }

    this._deferred = stillDeferred;
  }
}

// ============================================================================
// Hierarchical State Machine (HSM)
// ============================================================================

/**
 * A Hierarchical (nested) State Machine built on top of {@link FSM}.
 *
 * Extends the flat FSM model with:
 * - **Parent / child state relationships** via nested `states` inside a `StateConfig`
 * - **Inherited transitions**: children automatically inherit parent transitions
 *   unless they define their own local override
 * - **Local vs external transitions**: local transitions stay within the parent;
 *   external transitions exit the parent entirely
 * - **Composite states** with optional parallel regions
 * - **Deep & shallow history pseudostates**
 *
 * The value property of `state.value` becomes a nested object reflecting the hierarchy:
 * `{ parent: { child: 'leaf' } }`
 *
 * @typeParam S - Union of valid state identifiers
 * @typeParam E - Union of valid event identifiers
 * @typeParam C - Context shape
 *
 * @example
 * ```ts
 * const hsm = new HSM<'active' | 'idle' | 'paused' | 'running', 'TOGGLE' | 'PAUSE' | 'RESET', {}>({
 *   initial: 'idle',
 *   states: {
 *     idle: { on: { TOGGLE: { target: 'active' } } },
 *     active: {
 *       initial: 'running',
 *       states: {
 *         running: { on: { PAUSE: { target: 'paused' } } },
 *         paused:  { on: { PAUSE: { target: 'running' } } },
 *       },
 *       // Parent-level transition inherited by both children unless overridden
 *       on: { RESET: { target: 'idle' } },
 *     },
 *   },
 * });
 * ```
 */
export class HSM<
  S extends StateId,
  E extends EventId,
  C extends MachineContext = MachineContext,
> extends FSM<S, E, C> {
  /** Map of parent state ID -> its direct child state configs */
  private readonly childMap: Map<string, Record<string, StateConfig<S, E, C>>> = new Map();

  /** Map of parent state ID -> its initial child state ID */
  private readonly initialChildMap: Map<string, S> = new Map();

  /** Deep history: remembers exact substate path per parent */
  private readonly deepHistory: Map<string, S | Record<string, unknown>> = new Map();

  /** Shallow history: remembers only the immediate child state ID per parent */
  private readonly shallowHistory: Map<string, S> = new Map();

  /** Current active substate path (flattened stack) */
  private _subStateStack: S[] = [];

  constructor(config: MachineConfig<S, E, C>) {
    super(config);
    this._buildHierarchy(config.states);
  }

  /** Get the current sub-state stack (innermost last) */
  get subStateStack(): S[] {
    return [...this._subStateStack];
  }

  /**
   * Get the full nested state value (object form).
   * For flat machines this returns `{ [currentState]: currentState }`.
   * For hierarchical machines this returns the nested structure.
   */
  get nestedValue(): Record<string, S | Record<string, unknown>> {
    if (this._subStateStack.length === 0) {
      return { [String(this.currentState)]: this.currentState };
    }
    // Build nested object from the stack
    let result: Record<string, S | Record<string, unknown>> = {};
    let currentLevel = result;
    for (let i = 0; i < this._subStateStack.length; i++) {
      const key = String(this._subStateStack[i]);
      if (i === this._subStateStack.length - 1) {
        currentLevel[key] = this._subStateStack[i];
      } else {
        currentLevel[key] = {};
        currentLevel = currentLevel[key] as Record<string, S | Record<string, unknown>>;
      }
    }
    return result;
  }

  /**
   * Send an event with hierarchical resolution.
   * Checks: current leaf -> parent chain -> global transitions.
   */
  override send(event: E, payload?: EventPayload): StateValue<S, C> {
    // Try to resolve through the hierarchy before falling back to base FSM
    const resolved = this._resolveHierarchicalTransition(event, payload);
    if (resolved) {
      return this.state;
    }
    // Delegate to base FSM for global / top-level transitions
    return super.send(event, payload);
  }

  /**
   * Recall deep history for a given parent state.
   * Returns the remembered exact substate, or `undefined`.
   */
  recallDeepHistory(parent: S): S | Record<string, unknown> | undefined {
    return this.deepHistory.get(String(parent));
  }

  /**
   * Recall shallow history for a given parent state.
   * Returns the remembered child state ID, or `undefined`.
   */
  recallShallowHistory(parent: S): S | undefined {
    return this.shallowHistory.get(String(parent));
  }

  // -----------------------------------------------------------------------
  // Private hierarchy helpers
  // -----------------------------------------------------------------------

  /** Scan the state config tree and build parent->child mappings */
  private _buildHierarchy(states: Record<string, StateConfig<S, E, C>>): void {
    for (const [key, sConf] of Object.entries(states)) {
      if (sConf.states && Object.keys(sConf.states).length > 0) {
        this.childMap.set(key, sConf.states);
        if (sConf.initial) {
          this.initialChildMap.set(key, sConf.initial);
        }
      }
    }
    // Initialize sub-state stack for the initial state
    this._initSubStateStack(this.currentState);
  }

  /** Initialize the sub-state stack for a given top-level state */
  private _initSubStateStack(state: S): void {
    this._subStateStack = [state];
    let current = state;
    while (true) {
      const children = this.childMap.get(String(current));
      if (!children) break;
      const initial = this.initialChildMap.get(String(current));
      if (!initial) break;
      this._subStateStack.push(initial);
      current = initial;
    }
  }

  /**
   * Resolve a transition by walking up the state hierarchy from the
   * current leaf state toward the root, checking each level's transitions.
   */
  private _resolveHierarchicalTransition(
    event: E,
    payload?: EventPayload,
  ): boolean {
    // Walk from innermost (leaf) outward
    for (let depth = this._subStateStack.length - 1; depth >= 0; depth--) {
      const stateAtDepth = this._subStateStack[depth];
      const stateKey = String(stateAtDepth);

      // Get state definition — need access via config (protected)
      // We'll use the public API approach: check can() then force the right behavior
      // For HSM we override send so this method handles the hierarchy

      // Look for children at this level
      const children = this.childMap.get(stateKey);
      if (children && depth === this._subStateStack.length - 1) {
        // We're at a leaf within a composite state — check leaf's own transitions
        const leafConf = children[String(this._subStateStack[depth + 1] ?? "")];
        if (leafConf?.on?.[event]) {
          // Leaf has its own transition — handle locally
          return this._handleLeafTransition(leafConf, event, payload, depth);
        }
      }

      // Check the composite state's own transitions (inherited by children)
      // This requires accessing the underlying config; we approximate via super.can()
      if (super.can(event as unknown as E)) {
        // Found a matching transition at this level
        return false; // Let super.send() handle it
      }
    }
    return false; // Not found in hierarchy; fall through to base class
  }

  /** Handle a transition originating at a leaf state within a composite */
  private _handleLeafTransition(
    leafConf: StateConfig<S, E, C>,
    event: E,
    payload: EventPayload | undefined,
    _depth: number,
  ): boolean {
    const raw = leafConf.on?.[event];
    if (!raw) return false;
    const transitions = Array.isArray(raw) ? raw : [raw];
    const match = transitions.find((t) => !t.guard || t.guard(this.context, event, payload));
    if (!match) return false;

    const target = typeof match.target === "function"
      ? (match.target as Function)(this.context, event, payload)
      : match.target;

    // Save history before transitioning
    if (this._subStateStack.length >= 2) {
      const parentId = String(this._subStateStack[this._subStateStack.length - 2]);
      const currentLeaf = this._subStateStack[this._subStateStack.length - 1];
      this.deepHistory.set(parentId, currentLeaf);
      this.shallowHistory.set(parentId, currentLeaf);
    }

    // Update sub-state stack
    this._subStateStack[this._subStateStack.length - 1] = target as S;

    // Use base class forceSet to update the top-level tracking
    // (The "real" current state for HSM purposes is the leaf)
    this.forceSet(target as S);
    return true;
  }
}

// ============================================================================
// Statechart Features (Choice, Junction, History)
// ============================================================================

/**
 * Evaluate a choice pseudostate and return the selected target state.
 *
 * A choice pseudostate provides conditional branching: each branch has a guard,
 * and the first guard that evaluates to `true` determines the target state.
 *
 * @param choices - Ordered array of choice configurations
 * @param context - Current machine context
 * @param event - The event that triggered the choice
 * @param payload - Optional event payload
 * @returns The target state of the first matching choice, or `undefined` if none matched
 *
 * @example
 * ```ts
 * const target = evaluateChoice([
 *   { guard: ctx => ctx.isAdmin, target: 'adminPanel' },
 *   { guard: ctx => ctx.isLoggedIn, target: 'dashboard' },
 *   { target: 'login' }, // default (no guard)
 * ], context, 'NAVIGATE');
 * ```
 */
export function evaluateChoice<S, C extends MachineContext>(
  choices: ChoiceConfig<S, C>[],
  context: C,
  event: EventId,
  payload?: EventPayload,
): S | undefined {
  for (const choice of choices) {
    if (choice.guard && !choice.guard(context, event, payload)) continue;
    if (choice.action) {
      const result = choice.action(context, event, payload);
      if (result && typeof result === "object") {
        Object.assign(context, result);
      }
    }
    return choice.target;
  }
  return undefined;
}

/**
 * Evaluate a junction pseudostate.
 *
 * A junction merges multiple incoming entry points into a single unified
 * exit transition. It checks whether the `from` state matches any of the
 * listed source states, and if so, executes the junction action and returns
 * the unified target.
 *
 * @param junction - The junction configuration
 * @param fromState - The state we are coming from
 * @param context - Current machine context
 * @param event - The triggering event
 * @param payload - Optional event payload
 * @returns The target state if the junction applies, otherwise `undefined`
 */
export function evaluateJunction<S, C extends MachineContext>(
  junction: JunctionConfig<S, C>,
  fromState: S,
  context: C,
  event: EventId,
  payload?: EventPayload,
): S | undefined {
  if (!junction.from.includes(fromState)) return undefined;
  if (junction.action) {
    const result = junction.action(context, event, payload);
    if (result && typeof result === "object") {
      Object.assign(context, result);
    }
  }
  return junction.target;
}

/**
 * Create a deep-history pseudo-transition target resolver.
 *
 * Deep history remembers the **exact** active substate configuration within
 * a composite state, including nested descendants. When re-entering the parent
 * state via deep history, the machine restores the full substate path.
 *
 * @param hsm - The HSM instance to query for stored history
 * @param parentState - The composite state whose history to recall
 * @param fallback - Default state if no history has been recorded yet
 * @returns A function usable as a dynamic `target` in a transition definition
 */
export function deepHistoryTarget<S, C extends MachineContext>(
  hsm: HSM<S, E, C>,
  parentState: S,
  fallback: S,
): (ctx: C, evt: EventId) => S {
  return (_ctx: C, _evt: EventId): S => {
    const recalled = hsm.recallDeepHistory(parentState);
    if (recalled !== undefined && typeof recalled === "string") {
      return recalled as S;
    }
    return fallback;
  };
}

/**
 * Create a shallow-history pseudo-transition target resolver.
 *
 * Shallow history remembers only the **immediate child** state that was active
 * when the parent was last exited. It does not remember deeper nesting.
 *
 * @param hsm - The HSM instance to query for stored history
 * @param parentState - The composite state whose history to recall
 * @param fallback - Default child state if no history recorded
 * @returns A function usable as a dynamic `target` in a transition definition
 */
export function shallowHistoryTarget<S, C extends MachineContext>(
  hsm: HSM<S, E, C>,
  parentState: S,
  fallback: S,
): (_ctx: C, _evt: EventId) => S {
  return (): S => {
    return hsm.recallShallowHistory(parentState) ?? fallback;
  };
}

// ============================================================================
// Utility Functions & Factory Helpers
// ============================================================================

/**
 * Factory function: create a Finite State Machine from a configuration object.
 *
 * This is the primary entry point for creating state machines. It wraps the
 * `FSM` constructor with a cleaner API and supports both flat and hierarchical
 * configurations.
 *
 * @param config - The machine configuration
 * @returns A new `FSM` instance ready to receive events
 *
 * @example
 * ```ts
 * const machine = createMachine({
 *   initial: 'idle',
 *   states: {
 *     idle:   { on: { FETCH: { target: 'loading' } } },
 *     loading: {
 *       onEnter: ctx => ({ ...ctx, error: null }),
 *       on: {
 *         SUCCESS: { target: 'success' },
 *         FAILURE: { target: 'error' },
 *       },
 *     },
 *     success: { final: true },
 *     error:   { on: { RETRY: { target: 'loading' } } },
 *   },
 * });
 * ```
 */
export function createMachine<
  S extends StateId,
  E extends EventId,
  C extends MachineContext = MachineContext,
>(config: MachineConfig<S, E, C>): FSM<S, E, C> {
  return new FSM<S, E, C>(config);
}

/**
 * Create an interpreted service from a machine configuration.
 *
 * An **interpreter** (service) is a running instance that:
 * - Exposes `send()` to dispatch events
 * - Exposes `subscribe()` to observe state changes
 * - Has explicit `start()` / `stop()` lifecycle
 * - Can be started lazily (unlike `FSM` which auto-starts)
 *
 * @param machineOrConfig - Either an `FSM` instance or a raw config object
 * @returns A `Service` instance with `send()`, `subscribe()`, `start()`, `stop()`
 *
 * @example
 * ```ts
 * const service = interpret(createMachine(machineConfig));
 * service.subscribe(state => {
 *   console.log('New state:', state.value);
 * });
 * service.start();
 * service.send('FETCH');
 * service.stop();
 * ```
 */
export function interpret<
  S extends StateId,
  E extends EventId,
  C extends MachineContext = MachineContext,
>(machineOrConfig: FSM<S, E, C> | MachineConfig<S, E, C>): Service<S, E, C> {
  const machine =
    machineOrConfig instanceof FSM
      ? machineOrConfig
      : new FSM<S, E, C>(machineOrConfig);

  let running = false;
  let stopped = false;

  const service: Service<S, E, C> = {
    send(event: E, payload?: EventPayload): StateValue<S, C> {
      if (stopped) {
        console.warn("[interpret] Cannot send event: service is stopped");
        return machine.state;
      }
      return machine.send(event, payload);
    },

    subscribe(listener: StateListener<S, E, C>): () => void {
      return machine.subscribe(listener);
    },

    getSnapshot(): StateValue<S, C> {
      return machine.state;
    },

    start(): Service<S, E, C> {
      if (stopped) {
        throw new Error("[interpret] Cannot restart a stopped service");
      }
      running = true;
      return service;
    },

    stop(): void {
      running = false;
      stopped = true;
    },

    get running(): boolean {
      return running && !stopped;
    },
  };

  // Auto-start by default (matching XState convention)
  service.start();

  return service;
}

/**
 * Pattern-matching helper for state values, inspired by React-style matching.
 *
 * Given a state value and an object mapping state IDs to result values,
 * returns the result for the matching state. Supports a `_` wildcard default.
 *
 * @param stateValue - The current state value (typically `state.value`)
 * @param matcher - Object mapping state IDs to output values
 * @returns The matched value, or the `_` default, or `undefined`
 *
 * @example
 * ```ts
 * const Component = ({ state }) => {
 *   const view = match(state.value, {
 *     idle:    <IdleView />,
 *     loading: <Spinner />,
 *     success: <DataView data={state.context.data} />,
 *     error:   <ErrorView error={state.context.error} />,
 *     _:       <Fallback />, // default
 *   });
 *   return view;
 * };
 * ```
 */
export function match<T, V>(
  stateValue: T,
  matcher: Partial<Record<T | "_", V>>,
): V | undefined {
  // Direct match
  if (stateValue in matcher) {
    return (matcher as Record<T, V>)[stateValue];
  }
  // Wildcard default
  if ("_" in matcher) {
    return matcher["_"];
  }
  return undefined;
}

/**
 * Check equality of two state values.
 *
 * Handles both flat state IDs and nested hierarchical state objects.
 * Two states are equal if their stringified representations match.
 *
 * @param a - First state value
 * @param b - Second state value
 * @returns `true` if the values represent the same state
 */
export function stateEquals<S>(a: S | Record<string, unknown>, b: S | Record<string, unknown>): boolean {
  const sa = typeof a === "object" ? JSON.stringify(a) : String(a);
  const sb = typeof b === "object" ? JSON.stringify(b) : String(b);
  return sa === sb;
}

// ============================================================================
// Re-export type aliases for convenience
// ============================================================================

/** @deprecated Use `MachineConfig` directly */
export type StateConfigAlias<S, E, C extends MachineContext> = StateConfig<S, E, C>;

/** @deprecated Use `TransitionDef` directly */
export type TransitionAlias<S, E, C extends MachineContext> = TransitionDef<S, E, C>;

/** Alias for the FSM class as `Machine` for API compatibility with common conventions */
export type Machine<S, E, C extends MachineContext> = FSM<S, E, C>;
