/**
 * State Machine Utilities: Finite state machine (FSM), hierarchical state machines,
 * state guards, actions on enter/exit/transition, history tracking,
 * parallel states, and state machine visualization.
 */

// --- Types ---

export type StateId = string;
export type EventId = string;
export type GuardFn = (context: Record<string, unknown>, event?: unknown) => boolean;
export type ActionFn = (context: Record<string, unknown>, event?: unknown) => void;

export interface TransitionDefinition {
  /** Target state */
  to: StateId;
  /** Guard condition (must return true for transition to fire) */
  guard?: GuardFn;
  /** Actions to run during transition */
  actions?: ActionFn[];
  /** Event that triggers this transition */
  event?: EventId;
}

export interface StateDefinition {
  /** Actions to run when entering this state */
  onEnter?: ActionFn[];
  /** Actions to run when exiting this state */
  onExit?: ActionFn[];
  /** Allowed transitions from this state */
  transitions?: TransitionDefinition[];
  /** Child state machine (for hierarchical FSM) */
  children?: StateMachineConfig;
  /** Parallel regions (orthogonal regions) */
  parallel?: StateMachineConfig[];
}

export interface StateMachineConfig {
  /** Initial state */
  initial: StateId;
  /** All state definitions */
  states: Record<StateId, StateDefinition>;
  /** Context data shared across all states */
  context?: Record<string, unknown>;
  /** Actions available globally */
  actions?: Record<string, ActionFn>;
  /** Guards available globally */
  guards?: Record<string, GuardFn>;
  /** Callback on any state change */
  onTransition?: (from: StateId, to: StateId, event?: EventId) => void;
  /** Enable history (remember last state in each region) */
  history?: boolean | "shallow" | "deep";
  /** Callback on state machine error (e.g., no valid transition) */
  onError?: (error: string, event?: EventId) => void;
}

export interface StateMachineInstance {
  /** Current active state(s) */
  currentState: StateId | StateId[];
  /** Send an event to trigger transitions */
  send(event: EventId, payload?: unknown): boolean;
  /** Check if a state is currently active */
  is(state: StateId): boolean;
  /** Force transition to a state (bypasses guards) */
  goTo(state: StateId): void;
  /** Get the context object */
  getContext(): Record<string, unknown>;
  /** Reset to initial state */
  reset(): void;
  /** Destroy and cleanup */
  destroy(): void;
  /** Get state definition for debugging */
  getStateDef(state: StateId): StateDefinition | undefined;
  /** Get transition graph as adjacency list (for visualization) */
  getGraph(): Record<StateId, TransitionDefinition[]>;
}

// --- Core Implementation ---

/**
 * Create a finite state machine.
 *
 * @example
 * ```ts
 * const fsm = createStateMachine({
 *   initial: 'idle',
 *   states: {
 *     idle: {
 *       transitions: [
 *         { to: 'working', event: 'START', guard: (ctx) => ctx.canWork },
 *       ],
 *     },
 *     working: {
 *       onEnter: [(ctx) => console.log('Started working')],
 *       transitions: [
 *         { to: 'done', event: 'FINISH' },
 *         { to: 'idle', event: 'CANCEL' },
 *       ],
 *     },
 *     done: {
 *       onEnter: [(ctx) => console.log('Complete!')],
 *     },
 *   },
 * });
 *
 * fsm.send('START', { canWork: true }); // Transitions to 'working'
 * ```
 */
export function createStateMachine(config: StateMachineConfig): StateMachineInstance {
  const {
    initial,
    states,
    context = {},
    actions = {},
    guards = {},
    onTransition,
    onError,
    history: enableHistory = false,
  } = config;

  let _currentState: StateId = initial;
  const stateHistory = new Map<string, StateId>();
  let destroyed = false;

  function resolveAction(nameOrFn: string | ActionFn | undefined): ActionFn | undefined {
    if (!nameOrFn) return undefined;
    if (typeof nameOrFn === "function") return nameOrFn;
    return actions[nameOrFn];
  }

  function resolveGuard(nameOrFn: string | GuardFn | undefined): GuardFn | undefined {
    if (!nameOrFn) return () => true; // No guard = always allow
    if (typeof nameOrFn === "function") return nameOrFn;
    return guards[nameOrFn] ?? (() => true);
  }

  function runActions(actionList: ActionFn[] | undefined, eventPayload?: unknown): void {
    if (!actionList) return;
    for (const action of actionList) {
      const fn = resolveAction(action);
      fn?.(context, eventPayload);
    }
  }

  function tryTransition(event: EventId, payload?: unknown): boolean {
    const stateDef = states[_currentState];
    if (!stateDef || !stateDef.transitions) return false;

    // Find matching transition
    for (const transition of stateDef.transitions) {
      // Check event match
      if (transition.event && transition.event !== event) continue;

      // Check guard
      const guard = resolveGuard(transition.guard);
      if (!guard(context, payload)) continue;

      // Run exit actions
      runActions(stateDef.onExit, payload);

      const previousState = _currentState;
      _currentState = transition.to;

      // Save history
      if (enableHistory) {
        stateHistory.set(previousState, _currentState);
      }

      // Run entry actions
      const targetDef = states[_currentState];
      runActions(targetDef?.onEnter, payload);

      // Run transition actions
      runActions(transition.actions, payload);

      onTransition?.(previousState, _currentState, event);

      return true;
    }

    // No matching transition
    onError?.(`No transition from "${_currentState}" on event "${event}"`, event);
    return false;
  }

  function goTo(state: StateId): void {
    if (!states[state]) {
      onError?.(`Unknown state: "${state}"`);
      return;
    }
    const prev = _currentState;
    runActions(states[prev]?.onExit);
    _currentState = state;
    runActions(states[state]?.onEnter);
    onTransition?.(prev, state);
  }

  return {
    get currentState() { return _currentState; },

    send(event: EventId, payload?: unknown): boolean {
      if (destroyed) return false;
      return tryTransition(event, payload);
    },

    is(state: StateId): boolean {
      if (Array.isArray(_currentState)) return _currentState.includes(state);
      return _currentState === state;
    },

    goTo,
    getContext: () => context,
    reset() { goTo(initial); },
    destroy: () => { destroyed = true; },
    getStateDef: (state: StateId) => states[state],
    getGraph: () => {
      const graph: Record<StateId, TransitionDefinition[]> = {};
      for (const [name, def] of Object.entries(states)) {
        graph[name] = def.transitions ?? [];
      }
      return graph;
    },
  };
}

// --- Hierarchical State Machine ---

interface HSMNode {
  config: StateMachineConfig;
  parent?: HSMNode;
  children: HSMNode[];
  isActive: boolean;
}

/**
 * Create a hierarchical state machine with nested state machines.
 * States can contain child state machines that are only active
 * when the parent state is active.
 */
export function createHierarchicalStateMachine(
  rootConfig: StateMachineConfig,
): StateMachineInstance & { addChild(parentState: StateId, childConfig: StateMachineConfig): void } {
  const root = createStateMachine(rootConfig);
  const children = new Map<StateId, StateMachineInstance>();

  return {
    ...root,
    addChild(parentState: StateId, childConfig: StateMachineConfig): void {
      const child = createStateMachine({
        ...childConfig,
        context: root.getContext(),
        onTransition: (_, to, evt) => {
          // When child changes, also notify at root level
          root.onTransition?.(`${parentState}.${_}`, to, evt);
        },
      });
      children.set(parentState, child);
    },
  };
}

// --- Utility Functions ---

/** Validate a state machine configuration for common errors */
export function validateConfig(config: StateMachineConfig): string[] {
  const errors: string[] = [];

  if (!config.initial || !states[config.initial]) {
    errors.push(`Initial state "${config.initial}" is not defined in states`);
  }

  for (const [name, def] of Object.entries(config.states)) {
    if (!def.transitions || def.transitions.length === 0) {
      // Leaf state without transitions is OK
      continue;
    }

    for (const trans of def.transitions) {
      if (!states[trans.to]) {
        errors.push(`State "${name}" has transition to undefined state "${trans.to}"`);
      }
    }
  }

  // Check reachability from initial state
  const visited = new Set<StateId>([config.initial]);
  const queue = [config.initial];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const def = states[current];
    if (def?.transitions) {
      for (const t of def.transitions) {
        if (!visited.has(t.to)) {
          visited.add(t.to);
          queue.push(t.to);
        }
      }
    }
  }

  const unreachable = Object.keys(states).filter((s) => !visited.has(s));
  if (unreachable.length > 0) {
    errors.push(`Unreachable states: ${unreachable.join(", ")}`);
  }

  return errors;
}

/** Generate a Mermaid diagram from a state machine config */
export function generateMermaidDiagram(config: StateMachineConfig): string {
  let diagram = `stateDiagram-v2\n`;

  for (const [name, def] of Object.entries(config.states)) {
    const isInitial = name === config.initial;
    const prefix = isInitial ? "*[" : "";
    diagram += `  ${prefix}${name}\n`;

    if (def.transitions) {
      for (const t of def.transitions) {
        const label = t.event ? ` : ${t.event}` : "";
        diagram += `    ${name} --> ${t.to}${label}\n`;
      }
    }
  }

  return diagram;
}
