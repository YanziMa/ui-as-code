/**
 * Gamepad API wrapper with polling, button/axis mapping, deadzone handling,
 * vibration feedback, and multi-controller support.
 */

// --- Types ---

export interface GamepadButtonState {
  /** Button index */
  index: number;
  /** Pressed state */
  pressed: boolean;
  /** Touch state (some controllers) */
  touched: boolean;
  /** Analog value 0-1 */
  value: number;
}

export interface GamepadAxisState {
  /** Axis index */
  index: number;
  /** Value -1 to 1 */
  value: number;
  /** Normalized value after deadzone */
  normalized: number;
}

export interface GamepadState {
  /** Gamepad index */
  index: number;
  /** Controller ID string */
  id: string;
  /** Mapping type ("standard", "", etc.) */
  mapping: string;
  /** Connected status */
  connected: boolean;
  /** Timestamp of last update */
  timestamp: number;
  /** All button states */
  buttons: GamepadButtonState[];
  /** All axis states */
  axes: GamepadAxisState[];
}

export interface GamepadOptions {
  /** Polling interval in ms (default: 16 ~60fps) */
  pollIntervalMs?: number;
  /** Deadzone for analog inputs (-1 to 1, default: 0.08) */
  deadzone?: number;
  /** Called when a gamepad connects */
  onConnect?: (state: GamepadState) => void;
  /** Called when a gamepad disconnects */
  onDisconnect?: (index: number) => void;
  /** Called every poll cycle with all connected gamepads */
  onFrame?: (gamepads: GamepadState[]) => void;
  /** Called when any button press state changes */
  onButtonChange?: (gamepadIndex: number, button: GamepadButtonState) => void;
  /** Called when any axis value changes significantly */
  onAxisChange?: (gamepadIndex: number, axis: GamepadAxisState) => void;
  /** Auto-start polling (default: true) */
  autoStart?: boolean;
}

export interface GamepadInstance {
  /** All currently connected gamepad states */
  readonly gamepads: GamepadState[];
  /** Number of connected gamepads */
  readonly count: number;
  /** Whether the Gamepad API is supported */
  readonly supported: boolean;
  /** Start polling */
  start: () => void;
  /** Stop polling */
  stop: () => void;
  /** Get gamepad by index */
  getGamepad: (index: number) => GamepadState | null;
  /** Subscribe to frame updates */
  subscribe: (listener: (gamepads: GamepadState[]) => void) => () => void;
  /** Vibrate a gamepad (if supported) */
  vibrate: (index: number, pattern: number[] | number, duration?: number) => Promise<void>;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function applyDeadzone(value: number, deadzone: number): number {
  if (Math.abs(value) < deadzone) return 0;
  // Rescale so there's no jump at the deadzone boundary
  const sign = value >= 0 ? 1 : -1;
  return sign * ((Math.abs(value) - deadzone) / (1 - deadzone));
}

function mapButtons(gp: Gamepad, deadzone: number): GamepadButtonState[] {
  return Array.from(gp.buttons).map((b, i) => ({
    index: i,
    pressed: b.pressed,
    touched: b.touched,
    value: b.value,
  }));
}

function mapAxes(gp: Gamepad, deadzone: number): GamepadAxisState[] {
  return gp.axes.map((v, i) => ({
    index: i,
    value: v,
    normalized: applyDeadzone(v, deadzone),
  }));
}

// --- Main ---

export function createGamepadManager(options: GamepadOptions = {}): GamepadInstance {
  const {
    pollIntervalMs = 16,
    deadzone = 0.08,
    onConnect,
    onDisconnect,
    onFrame,
    onButtonChange,
    onAxisChange,
    autoStart = true,
  } = options;

  let running = false;
  let destroyed = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<(gamepads: GamepadState[]) => void>();
  const prevStates = new Map<number, GamepadState>();

  const supported = typeof navigator !== "undefined" && "getGamepads" in navigator;

  function scan(): GamepadState[] {
    if (!supported) return [];

    const gamepads = navigator.getGamepads();
    const states: GamepadState[] = [];

    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp) continue;

      const state: GamepadState = {
        index: i,
        id: gp.id,
        mapping: gp.mapping,
        connected: gp.connected,
        timestamp: gp.timestamp,
        buttons: mapButtons(gp, deadzone),
        axes: mapAxes(gp, deadzone),
      };

      // Detect connect/disconnect
      const prev = prevStates.get(i);
      if (!prev && gp.connected) {
        onConnect?.(state);
      } else if (prev && !gp.connected) {
        onDisconnect?.(i);
        prevStates.delete(i);
        continue;
      }

      // Detect button changes
      if (prev && onButtonChange) {
        for (let bi = 0; bi < state.buttons.length; bi++) {
          const pb = prev.buttons[bi];
          const cb = state.buttons[bi];
          if (pb && cb && pb.pressed !== cb.pressed) {
            onButtonChange(i, cb);
          }
        }
      }

      // Detect axis changes
      if (prev && onAxisChange) {
        for (let ai = 0; ai < state.axes.length; ai++) {
          const pa = prev.axes[ai];
          const ca = state.axes[ai];
          if (pa && ca && Math.abs(pa.normalized - ca.normalized) > 0.05) {
            onAxisChange(i, ca);
          }
        }
      }

      prevStates.set(i, state);
      states.push(state);
    }

    return states;
  }

  function tick(): void {
    if (destroyed || !running) return;
    const states = scan();

    for (const listener of listeners) {
      try { listener(states); } catch { /* ignore */ }
    }
    onFrame?.(states);
  }

  function start(): void {
    if (running || destroyed) return;
    running = true;
    pollTimer = setInterval(tick, pollIntervalMs);
  }

  function stop(): void {
    running = false;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  if (autoStart) start();

  const instance: GamepadInstance = {
    get gamepads() { return scan(); },
    get count() { return scan().length; },
    get supported() { return supported; },

    start,
    stop,

    getGamepad(index: number): GamepadState | null {
      const states = scan();
      return states.find((s) => s.index === index) ?? null;
    },

    subscribe(listener: (gamepads: GamepadState[]) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async vibrate(index: number, pattern: number[] | number, duration?: number): Promise<void> {
      const gp = navigator.getGamepads()[index];
      const actuator = gp?.vibrationActuator;
      if (!actuator || !("playEffect" in actuator)) return;

      try {
        const vibeActuator = actuator as { playEffect: (type: string, params: Record<string, unknown>) => Promise<unknown> };
        await vibeActuator.playEffect("dual-rumble", {
          startDelay: 0,
          duration: duration ?? (Array.isArray(pattern) ? pattern.reduce((a, b) => a + b, 0) : pattern),
          weakMagnitude: Array.isArray(pattern) ? (pattern[0] ?? 1) : pattern,
          strongMagnitude: Array.isArray(pattern) ? (pattern[1] ?? pattern[0]) : pattern,
        });
      } catch { /* vibration not supported */ }
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      listeners.clear();
      prevStates.clear();
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Quick check: is Gamepad API available? */
export function isGamepadSupported(): boolean {
  return typeof navigator !== "undefined" && "getGamepads" in navigator;
}

/** Get snapshot of all connected gamepads (one-time read) */
export function getGamepadsSnapshot(): GamepadState[] {
  if (!isGamepadSupported()) return [];
  const gps = navigator.getGamepads();
  const states: GamepadState[] = [];
  for (let i = 0; i < gps.length; i++) {
    const gp = gps[i];
    if (gp?.connected) {
      states.push({
        index: i,
        id: gp.id,
        mapping: gp.mapping,
        connected: true,
        timestamp: gp.timestamp,
        buttons: mapButtons(gp, 0.08),
        axes: mapAxes(gp, 0.08),
      });
    }
  }
  return states;
}
