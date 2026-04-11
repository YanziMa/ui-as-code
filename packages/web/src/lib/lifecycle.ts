/**
 * Lifecycle: Component/app lifecycle hooks and phase management.
 *
 * Provides:
 *   - Lifecycle phases (init, load, activate, deactivate, update, unload, destroy)
 *   - Hook registration per phase
 *   - Phase transition guards (allow/prevent transitions)
 *   - Async lifecycle with dependency resolution
 *   - Lifecycle state machine
 *   - Mount/unmount detection via IntersectionObserver
 *   - Visibility change tracking
 */

// --- Types ---

export type LifecyclePhase =
  | "created"
  | "initialized"
  | "mounted"
  | "active"
  | "inactive"
  | "updating"
  | "deactivating"
  | "unmounting"
  | "destroyed";

export interface LifecycleHook {
  (): void | Promise<void>;
}

export interface LifecycleGuard {
  (from: LifecyclePhase, to: LifecyclePhase): boolean | Promise<boolean>;
}

export interface LifecycleConfig {
  /** Initial phase (default: "created") */
  initialPhase?: LifecyclePhase;
  /** Whether to allow re-activation after destroy (default: false) */
  allowResurrection?: boolean;
  /** Debug logging */
  debug?: boolean;
  /** Custom phase transition map (if not using default) */
  transitions?: Record<LifecyclePhase, LifecyclePhase[]>;
}

export interface LifecycleInstance {
  /** Current phase */
  phase: LifecyclePhase;
  /** Previous phase */
  previousPhase: LifecyclePhase | null;
  /** Transition to a new phase */
  goTo: (phase: LifecyclePhase) => Promise<boolean>;
  /** Register a hook for a specific phase */
  on: (phase: LifecyclePhase, hook: LifecycleHook) => () => void;
  /** Register a guard that can prevent transitions */
  guard: (guardFn: LifecycleGuard) => () => void;
  /** Check if currently in a given phase (or array of phases) */
  is: (...phases: LifecyclePhase[]) => boolean;
  /** Check if transition is allowed */
  canGoTo: (phase: LifecyclePhase) => boolean;
  /** Get transition history */
  getHistory: () => Array<{ from: LifecyclePhase; to: LifecyclePhase; timestamp: number }>;
  /** Destroy the lifecycle instance */
  destroy: () => void;
}

// --- Default State Machine ---

const DEFAULT_TRANSITIONS: Record<LifecyclePhase, LifecyclePhase[]> = {
  created:       ["initialized", "destroyed"],
  initialized:   ["mounted", "destroyed"],
  mounted:       ["active", "unmounting", "destroyed"],
  active:        ["inactive", "updating", "deactivating", "unmounting", "destroyed"],
  inactive:      ["active", "unmounting", "destroyed"],
  updating:      ["active", "inactive", "deactivating", "destroyed"],
  deactivating: ["inactive", "destroyed"],
  unmounting:    ["destroyed"],
  destroyed:     [], // Terminal state
};

// --- Main Factory ---

export function createLifecycle(config: LifecycleConfig = {}): LifecycleInstance {
  const { initialPhase = "created", allowResurrection = false, debug = false } = config;
  const transitions = config.transitions ?? DEFAULT_TRANSITIONS;

  let currentPhase: LifecyclePhase = initialPhase;
  let previousPhase: LifecyclePhase | null = null;
  const hooks = new Map<LifecyclePhase, Set<LifecycleHook>>();
  const guards: Set<LifecycleGuard> = new Set();
  const history: Array<{ from: LifecyclePhase; to: LifecyclePhase; timestamp: number }> = [];
  let destroyed = false;

  function log(...args: unknown[]): void {
    if (debug) console.log("[Lifecycle]", ...args);
  }

  async function goTo(targetPhase: LifecyclePhase): Promise<boolean> {
    if (destroyed && !allowResurrection) {
      log(`Cannot transition: instance is destroyed`);
      return false;
    }

    if (targetPhase === currentPhase) {
      log(`Already in phase: ${targetPhase}`);
      return true;
    }

    // Check if transition is valid
    const allowed = transitions[currentPhase] ?? [];
    if (!allowed.includes(targetPhase)) {
      log(`Invalid transition: ${currentPhase} -> ${targetPhase}`);
      return false;
    }

    // Run guards
    for (const guard of guards) {
      try {
        const proceed = await guard(currentPhase, targetPhase);
        if (!proceed) {
          log(`Transition blocked by guard: ${currentPhase} -> ${targetPhase}`);
          return false;
        }
      } catch (err) {
        log(`Guard error:`, err);
        return false;
      }
    }

    // Execute transition
    previousPhase = currentPhase;
    currentPhase = targetPhase;
    history.push({ from: previousPhase, to: targetPhase, timestamp: Date.now() });

    log(`${previousPhase} -> ${targetPhase}`);

    // Run exit hooks for previous phase
    await runHooks(previousPhase);

    // Run enter hooks for new phase
    await runHooks(targetPhase);

    return true;
  }

  async function runHooks(phase: LifecyclePhase): Promise<void> {
    const phaseHooks = hooks.get(phase);
    if (!phaseHooks) return;

    for (const hook of phaseHooks) {
      try { await hook(); } catch (err) { log(`Hook error in ${phase}:`, err); }
    }
  }

  function on(phase: LifecyclePhase, hook: LifecycleHook): () => void {
    if (!hooks.has(phase)) hooks.set(phase, new Set());
    hooks.get(phase)!.add(hook);
    return () => { hooks.get(phase)?.delete(hook); };
  }

  function guard(guardFn: LifecycleGuard): () => void {
    guards.add(guardFn);
    return () => { guards.delete(guardFn); };
  }

  function is(...phases: LifecyclePhase[]): boolean {
    return phases.includes(currentPhase);
  }

  function canGoTo(phase: LifecyclePhase): boolean {
    if (destroyed && !allowResurrection && phase !== "destroyed") return false;
    return (transitions[currentPhase] ?? []).includes(phase);
  }

  function destroy(): void {
    destroyed = true;
    hooks.clear();
    guards.clear();
  }

  return {
    get phase() { return currentPhase; },
    get previousPhase() { return previousPhase; },
    goTo,
    on,
    guard,
    is,
    canGoTo,
    getHistory: () => [...history],
    destroy,
  };
}

// --- DOM Lifecycle Helpers ---

/** Create a lifecycle tied to an element's DOM presence */
export function createDomLifecycle(
  element: HTMLElement,
  parentLifecycle?: LifecycleInstance,
): LifecycleInstance & { startObserving: () => void; stopObserving: () => void } {
  const lc = createLifecycle({ initialPhase: "created" });

  let observer: IntersectionObserver | null = null;

  function startObserving(): void {
    if (observer) return;

    observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          if (lc.phase === "created") lc.goTo("initialized").then(() => lc.goTo("mounted"));
          else if (lc.phase === "unmounting") lc.goTo("mounted").then(() => lc.goTo("active"));
        } else {
          if (lc.phase === "active") lc.goTo("inactive");
        }
      },
      { threshold: 0 },
    );

    observer.observe(element);

    // Initial check
    if (element.isConnected) {
      lc.goTo("initialized").then(() => lc.goTo("mounted")).then(() => lc.goTo("active"));
    }
  }

  function stopObserving(): void {
    observer?.disconnect();
    observer = null;
  }

  // Cleanup when element removed from DOM
  const mo = new MutationObserver(() => {
    if (!element.isConnected && (lc.phase === "active" || lc.phase === "mounted")) {
      lc.goTo("unmounting").then(() => lc.goTo("destroyed"));
      stopObserving();
      mo.disconnect();
    }
  });

  mo.observe(element.parentNode ?? document.body, { childList: true });
  startObserving();

  return { ...lc, startObserving, stopObserving };
}

// --- Visibility Lifecycle ---

/** Create a lifecycle based on page visibility */
export function createVisibilityLifecycle(): LifecycleInstance {
  const lc = createLifecycle({ initialPhase: document.hidden ? "inactive" : "active" });

  document.addEventListener("visibilitychange", async () => {
    if (document.hidden) await lc.goTo("inactive");
    else await lc.goTo("active");
  });

  return lc;
}
