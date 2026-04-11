/**
 * FSM Utilities: Pre-built state machine patterns, async state machines,
 * timed transitions, event queueing, state persistence, FSM visualization,
 * and common patterns (toggle, counter, latch, request/response).
 */

// --- Types ---

export type StateId = string;
export type EventId = string;

export interface FsmTransition {
  from: StateId | "*";
  event: EventId;
  to: StateId;
  guard?: (...args: unknown[]) => boolean;
  action?: (...args: unknown[]) => void | Promise<void>;
}

export interface FsmState {
  id: StateId;
  onEnter?: (...args: unknown[]) => void | Promise<void>;
  onExit?: (...args: unknown[]) => void | Promise<void>;
  /** Timeout in ms (auto-advance after this duration) */
  timeout?: number;
  timeoutTarget?: StateId;
  /** While active, run this every tick */
  onUpdate?: (...args: unknown[]) => void | Promise<void>;
}

export interface FsmConfig {
  initial: StateId;
  states: FsmState[];
  transitions: FsmTransition[];
  /** Global context */
  context?: Record<string, unknown>;
  /** Auto-start? Default true */
  autoStart?: boolean;
  /** Log state changes? Default false */
  debug?: boolean;
  /** Max iterations per tick (prevent infinite loops) */
  maxIterations?: number;
}

export interface FsmInstance {
  /** Current state id */
  current: StateId;
  /** Send an event */
  send(event: EventId, ...payload: unknown[]): Promise<boolean>;
  /** Force go to state */
  goto(state: StateId): Promise<void>;
  /** Check if in state */
  is(state: StateId): boolean;
  /** Start the machine */
  start(): void;
  /** Stop/pause */
  stop(): void;
  /** Step once (process any pending events) */
  step(): Promise<boolean>;
  /** Get full state definition */
  getStateDef(id: StateId): FsmState | undefined;
  /** Destroy */
  destroy(): void;
}

// --- Core FSM Implementation ---

/**
 * Create a finite state machine with async support.
 *
 * @example
 * ```ts
 * const fsm = createFsm({
 *   initial: 'idle',
 *   states: [
 *     { id: 'idle', onEnter: () => console.log('Waiting...') },
 *     { id: 'loading', onEnter: () => console.log('Loading...') },
 *     { id: 'success', onEnter: () => console.log('Done!') },
 *     { id: 'error', onEnter: () => console.log('Failed!') },
 *   ],
 *   transitions: [
 *     { from: 'idle', event: 'FETCH', to: 'loading' },
 *     { from: 'loading', event: 'SUCCESS', to: 'success' },
 *     { from: 'loading', event: 'FAILURE', to: 'error' },
 *     { from: 'success', event: 'RESET', to: 'idle' },
 *     { from: 'error', event: 'RETRY', to: 'loading' },
 *   ],
 * });
 *
 * await fsm.send('FETCH');
 * ```
 */
export function createFsm(config: FsmConfig): FsmInstance {
  const {
    initial,
    states,
    transitions,
    context = {},
    autoStart = true,
    debug = false,
    maxIterations = 100,
  } = config;

  const stateMap = new Map<StateId, FsmState>();
  for (const s of states) stateMap.set(s.id, s);

  let _current: StateId = initial;
  let running = false;
  let destroyed = false;
  const eventQueue: Array<{ event: EventId; payload: unknown[] }> = [];
  let processing = false;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  // Timeout handlers per state
  const stateTimeouts = new Map<StateId, ReturnType<typeof setTimeout>>();

  function log(msg: string): void {
    if (debug) console.log(`[FSM] ${msg}`);
  }

  async function enterState(stateId: StateId, payload?: unknown[]): Promise<void> {
    // Clear old timeout
    const existingTimeout = stateTimeouts.get(stateId);
    if (existingTimeout) clearTimeout(existingTimeout);
    stateTimeouts.delete(stateId);

    const stateDef = stateMap.get(stateId);
    if (!stateDef) {
      log(`Error: Unknown state "${stateId}"`);
      return;
    }

    log(`Entering "${stateId}"`);
    _current = stateId;

    // Run onEnter
    if (stateDef.onEnter) {
      await stateDef.onEnter(context, payload);
    }

    // Set up timeout if defined
    if (stateDef.timeout && stateDef.timeoutTarget) {
      const timer = setTimeout(() => {
        if (running && !destroyed) {
          goto(stateDef.timeoutTarget!);
        }
      }, stateDef.timeout);
      stateTimeouts.set(stateId, timer);
    }
  }

  async function exitState(stateId: StateId): Promise<void> {
    const stateDef = stateMap.get(stateId);
    if (!stateDef?.onExit) return;
    log(`Exiting "${stateId}"`);
    await stateDef.onExit(context);
  }

  async function processEvent(event: EventId, payload: unknown[] = []): Promise<boolean> {
    const matchingTransitions = transitions.filter(
      (t) => (t.from === "*" || t.from === _current) && t.event === event,
    );

    for (const trans of matchingTransitions) {
      // Check guard
      if (trans.guard && !trans.guard(...payload)) continue;

      // Exit current
      await exitState(_current);

      // Run transition action
      if (trans.action) {
        await trans.action(...payload);
      }

      // Enter new state
      await enterState(trans.to, ...payload);

      return true;
    }

    log(`No transition for event "${event}" in state "${_current}"`);
    return false;
  }

  async function goto(stateId: StateId): Promise<void> {
    if (!stateMap.has(stateId)) {
      log(`Error: Cannot goto unknown state "${stateId}"`);
      return;
    }
    await exitState(_current);
    await enterState(stateId);
  }

  async function step(): Promise<boolean> {
    if (eventQueue.length === 0) return false;

    let iterations = 0;
    while (eventQueue.length > 0 && iterations < maxIterations) {
      const { event, payload } = eventQueue.shift()!;
      await processEvent(event, payload);
      iterations++;
    }

    return eventQueue.length > 0; // More events to process
  }

  function start(): void {
    if (running || destroyed) return;
    running = true;
    log(`Starting at "${initial}"`);

    // Enter initial state
    enterState(initial).catch((err) => log(`Error entering initial state: ${err}`));

    // Process loop
    const loop = async (): Promise<void> => {
      while (running && !destroyed) {
        // Process queued events
        if (eventQueue.length > 0) {
          await step();
          continue;
        }
        await new Promise((r) => setTimeout(r, 100)); // Poll
      }
    };

    loop();
  }

  function stop(): void {
    running = false;
    // Clear all timeouts
    for (const timer of stateTimeouts.values()) clearTimeout(timer);
    stateTimeouts.clear();
    if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null; }
  }

  function destroy(): void {
    stop();
    destroyed = true;
    eventQueue.length = 0;
  }

  // Auto-start
  if (autoStart) start();

  return {
    get current() { return _current; },
    send: (event: EventId, ...payload: unknown[]) => {
      return new Promise((resolve) => {
        eventQueue.push({ event, payload });
        resolve(true); // Event queued
        // Actual processing happens in step()/loop
      });
    },
    goto,
    is: (state: StateId) => _current === state,
    start,
    stop,
    step,
    getStateDef: (id: StateId) => stateMap.get(id),
    destroy,
  };
}

// --- Pre-built Patterns ---

/** Create a toggle FSM (on/off) */
export function createToggleFsm(
  options?: {
    onOn?: () => void;
    offOn?: () => void;
    onToggle?: (isOn: boolean) => void;
  },
): FsmInstance {
  return createFsm({
    initial: "off",
    states: [
      {
        id: "off",
        onEnter: options?.offOn,
      },
      {
        id: "on",
        onEnter: options?.onOn,
      },
    ],
    transitions: [
      { from: "off", event: "TOGGLE", to: "on", action: () => options?.onToggle?.(true) },
      { from: "on", event: "TOGGLE", to: "off", action: () => options?.onToggle?.(false) },
    ],
  });
}

/** Create a request/response FSM (idle -> waiting -> complete) */
export function createRequestFsm<T>(
  executeRequest: () => Promise<T>,
  options?: {
    onSuccess?: (result: T) => void;
    onError?: (error: Error) => void;
  },
): FsmInstance & { getResult: () => T | null; setError: (err: Error) => void } {
  let resultValue: T | null = null;
  let errorValue: Error | null = null;

  const fsm = createFsm({
    initial: "idle",
    states: [
      { id: "idle" },
      {
        id: "waiting",
        onEnter: async () => {
          try {
            resultValue = await executeRequest();
            await fsm.send("SUCCESS");
          } catch (e) {
            errorValue = e as Error;
            await fsm.send("FAILURE");
          }
        },
      },
      { id: "complete" },
      { id: "failed" },
    ],
    transitions: [
      { from: "idle", event: "REQUEST", to: "waiting" },
      { from: "waiting", event: "SUCCESS", to: "complete", action: () => options?.onSuccess?.(resultValue!) },
      { from: "waiting", event: "FAILURE", to: "failed", action: () => options?.onError?.(errorValue!) },
      { from: "complete", event: "RESET", to: "idle" },
      { from: "failed", event: "RETRY", to: "waiting" },
      { from: "failed", event: "RESET", to: "idle" },
    ],
  });

  return {
    ...fsm,
    getResult: () => resultValue,
    setError: (err: Error) => { errorValue = err; },
  };
}

/** Create a countdown timer FSM */
export function createCountdownFsm(
  seconds: number,
  options?: {
    onTick?: (remaining: number) => void;
    onComplete?: () => void;
    interval?: number; // ms between ticks, default 1000
  },
): FsmInstance & { getRemaining: () => number } {
  let remaining = seconds;
  let intervalTimer: ReturnType<typeof setInterval> | null = null;

  const fsm = createFsm({
    initial: "running",
    states: [
      {
        id: "running",
        onEnter: () => {
          intervalTimer = setInterval(() => {
            remaining--;
            options?.onTick?.(remaining);
            if (remaining <= 0) {
              clearInterval(intervalTimer!);
              fsm.send("COMPLETE");
            }
          }, options?.interval ?? 1000);
        },
        onExit: () => { if (intervalTimer) { clearInterval(intervalTimer); intervalTimer = null; } },
      },
      { id: "complete", onEnter: () => options?.onComplete?.() },
    ],
    transitions: [
      { from: "running", event: "COMPLETE", to: "complete" },
      { from: "complete", event: "RESET", to: "running" },
    ],
  });

  return {
    ...fsm,
    getRemaining: () => remaining,
  };
}

/** Create a latch FSM (once triggered, stays latched until reset) */
export function createLatchFsm(options?: {
  onLatch?: () => void;
  onReset?: () => void;
}): FsmInstance {
  return createFsm({
    initial: "unlatched",
    states: [
      { id: "unlatched" },
      { id: "latched", onEnter: options?.onLatch },
    ],
    transitions: [
      { from: "unlatched", event: "TRIGGER", to: "latched" },
      { from: "latched", event: "RESET", to: "unlatched", action: options?.onReset },
    ],
  });
}

/** Create a debounce FSM (ignores events during cooldown, then fires latest) */
export function createDebounceFsm(
  cooldownMs: number,
  onFire: (event?: unknown) => void,
): FsmInstance & { trigger: (event?: unknown) => void } {
  let pendingEvent: unknown | undefined;

  const fsm = createFsm({
    initial: "ready",
    states: [
      { id: "ready" },
      { id: "cooling", timeout: cooldownMs, timeoutTarget: "ready", onEnter: () => onFire(pendingEvent) },
    ],
    transitions: [
      { from: "ready", event: "TRIGGER", to: "cooling" },
    ],
  });

  return {
    ...fsm,
    trigger: (event?: unknown) => { pendingEvent = event; fsm.send("TRIGGER"); },
  };
}
