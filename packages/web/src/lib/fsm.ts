/**
 * Simple finite state machine utility.
 */

export interface FSMState {
  name: string;
  onEnter?: () => void;
  onExit?: () => void;
}

export interface FSMTransition {
  from: string | string[];
  to: string;
  event: string;
  guard?: () => boolean;
  action?: () => void;
}

export interface FSMConfig {
  initial: string;
  states: Record<string, FSMState>;
  transitions: FSMTransition[];
  onTransition?: (from: string, to: string, event: string) => void;
}

export class FiniteStateMachine {
  private currentState: string;
  private states: Record<string, FSMState>;
  private transitions: Map<string, FSMTransition[]>;
  private onTransition?: (from: string, to: string, event: string) => void;

  constructor(config: FSMConfig) {
    this.currentState = config.initial;
    this.states = config.states;
    this.onTransition = config.onTransition;
    this.transitions = new Map();

    // Index transitions by event
    for (const t of config.transitions) {
      const froms = Array.isArray(t.from) ? t.from : [t.from];
      for (const from of froms) {
        if (!this.transitions.has(from)) this.transitions.set(from, []);
        this.transitions.get(from)!.push(t);
      }
    }
  }

  /** Get current state name */
  get state(): string {
    return this.currentState;
  }

  /** Check if currently in given state */
  is(state: string): boolean {
    return this.currentState === state;
  }

  /** Send an event to trigger a transition */
  send(event: string): boolean {
    const possibleTransitions = this.transitions.get(this.currentState) || [];
    const transition = possibleTransitions.find((t) => t.event === event);

    if (!transition) return false;

    // Check guard
    if (transition.guard && !transition.guard()) return false;

    const previousState = this.currentState;

    // Exit current state
    const exiting = this.states[previousState];
    exiting?.onExit?.();

    // Execute action
    transition.action?.();

    // Enter new state
    this.currentState = transition.to;
    const entering = this.states[this.currentState];
    entering?.onEnter?.();

    // Notify
    this.onTransition?.(previousState, this.currentState, event);

    return true;
  }

  /** Get all valid events from current state */
  getValidEvents(): string[] {
    const transitions = this.transitions.get(this.currentState) || [];
    return transitions.map((t) => t.event);
  }

  /** Reset to initial or specific state */
  reset(state?: string): void {
    const exiting = this.states[this.currentState];
    exiting?.onExit?.();
    this.currentState = state ?? Object.keys(this.states)[0] ?? "";
    const entering = this.states[this.currentState];
    entering?.onEnter?.();
  }
}

/** Create a simple two-state toggle FSM */
export function createToggle(initialOn = false): FiniteStateMachine {
  return new FiniteStateMachine({
    initial: initialOn ? "on" : "off",
    states: {
      on: { name: "on" },
      off: { name: "off" },
    },
    transitions: [
      { from: "off", to: "on", event: "toggle" },
      { from: "on", to: "off", event: "toggle" },
    ],
  });
}
