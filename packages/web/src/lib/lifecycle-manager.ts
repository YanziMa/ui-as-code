/**
 * Lifecycle Manager: Centralized lifecycle coordination for multiple
 * components, managing mount order, cleanup sequences, and
 * cross-component lifecycle dependencies.
 *
 * Provides:
 *   - Multi-instance lifecycle registry
 *   - Dependency-ordered initialization
 *   - Cascade deactivation/destroy
 *   - Phase broadcasting (notify all instances of phase changes)
 *   - Global lifecycle hooks
 *   - Performance-aware batched updates
 */

// --- Types ---

export interface ManagedInstance {
  /** Unique identifier */
  id: string;
  /** The lifecycle instance */
  lifecycle: import("./lifecycle").LifecycleInstance;
  /** Priority for ordering (lower = first) */
  priority?: number;
  /** Dependencies (instance IDs that must initialize before this one) */
  dependsOn?: string[];
  /** Metadata */
  meta?: Record<string, unknown>;
}

export interface LifecycleManagerConfig {
  /** Batch update delay in ms (default: 0 = synchronous) */
  batchDelay?: number;
  /** Global debug mode */
  debug?: boolean;
  /** Default priority for un-prioritized instances */
  defaultPriority?: number;
}

export interface LifecycleManager {
  /** Register a managed lifecycle instance */
  register: (instance: ManagedInstance) => void;
  /** Unregister an instance */
  unregister: (id: string) => Promise<void>;
  /** Initialize all registered instances (respecting deps) */
  initializeAll: () => Promise<void>;
  /** Activate all instances */
  activateAll: () => Promise<void>;
  /** Deactivate all instances */
  deactivateAll: () => Promise<void>;
  /** Destroy all instances */
  destroyAll: () => Promise<void>;
  /** Get an instance by ID */
  get: (id: string) => ManagedInstance | undefined;
  /** Get all instances ordered by priority */
  getAll: () => ManagedInstance[];
  /** Get instances in a given phase */
  getByPhase: (phase: import("./lifecycle").LifecyclePhase) => ManagedInstance[];
  /** Broadcast a phase transition to all matching instances */
  broadcast: (targetPhase: import("./lifecycle").LifecyclePhase) => Promise<void>;
  /** Add global pre-transition hook */
  onBeforeTransition: (hook: (id: string, from: import("./lifecycle").LifecyclePhase, to: import("./lifecycle").LifecyclePhase) => void | Promise<void>) => () => void;
  /** Add global post-transition hook */
  onAfterTransition: (hook: (id: string, from: import("./lifecycle").LifecyclePhase, to: import("./lifecycle").LifecyclePhase) => void | Promise<void>) => () => void;
  /** Get manager status */
  getStatus: () => { total: number; phases: Record<string, number> };
}

// --- Main Factory ---

export function createLifecycleManager(config: LifecycleManagerConfig = {}): LifecycleManager {
  const { defaultPriority = 100, debug = false } = config;
  const instances = new Map<string, ManagedInstance>();
  const beforeHooks = new Set<(id: string, from: import("./lifecycle").LifecyclePhase, to: import("./lifecycle").LifecyclePhase) => void | Promise<void>>();
  const afterHooks = new Set<(id: string, from: import("./lifecycle").LifecyclePhase, to: import("./lifecycle").LifecyclePhase) => void | Promise<void>>();

  function log(...args: unknown[]): void { if (debug) console.log("[LifecycleManager]", ...args); }

  function register(instance: ManagedInstance): void {
    if (instances.has(instance.id)) {
      log(`Instance "${instance.id}" already registered — updating`);
    }
    instances.set(instance.id, { ...instance, priority: instance.priority ?? defaultPriority });
    log(`Registered: ${instance.id} (priority: ${instance.priority ?? defaultPriority})`);
  }

  async function unregister(id: string): Promise<void> {
    const inst = instances.get(id);
    if (!inst) return;
    await inst.lifecycle.destroy();
    instances.delete(id);
    log(`Unregistered: ${id}`);
  }

  /** Resolve initialization order using topological sort */
  function resolveOrder(): ManagedInstance[] {
    const sorted: ManagedInstance[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    function visit(id: string): void {
      if (visited.has(id)) return;
      if (visiting.has(id)) { log(`Circular dependency detected involving: ${id}`); return; }

      visiting.add(id);
      const inst = instances.get(id);
      if (!inst) return;

      // Visit dependencies first
      for (const depId of inst.dependsOn ?? []) {
        visit(depId);
      }

      visiting.delete(id);
      visited.add(id);
      sorted.push(inst);
    }

    // Visit all instances, sorted by priority within same level
    const byPriority = Array.from(instances.values()).sort((a, b) => (a.priority ?? defaultPriority) - (b.priority ?? defaultPriority));
    for (const inst of byPriority) visit(inst.id);

    return sorted;
  }

  async function initializeAll(): Promise<void> {
    log("Initializing all instances...");
    const order = resolveOrder();

    for (const inst of order) {
      log(`  Initializing: ${inst.id}`);
      await runWithHooks(inst.id, "created", "initialized", () =>
        inst.lifecycle.goTo("initialized")
      );
    }

    // Then mount all
    for (const inst of order) {
      await runWithHooks(inst.id, "initialized", "mounted", () =>
        inst.lifecycle.goTo("mounted")
      );
    }

    log("All initialized");
  }

  async function activateAll(): Promise<void> {
    const order = resolveOrder();
    for (const inst of order) {
      if (inst.lifecycle.canGoTo("active")) {
        await runWithHooks(inst.id, inst.lifecycle.phase, "active", () =>
          inst.lifecycle.goTo("active")
        );
      }
    }
  }

  async function deactivateAll(): Promise<void> {
    // Deactivate in reverse order
    const order = resolveOrder().reverse();
    for (const inst of order) {
      if (inst.lifecycle.phase === "active") {
        await runWithHooks(inst.id, "active", "inactive", () =>
          inst.lifecycle.goTo("inactive")
        );
      }
    }
  }

  async function destroyAll(): Promise<void> {
    const order = resolveOrder().reverse(); // Destroy children first
    for (const inst of order) {
      await runWithHooks(inst.id, inst.lifecycle.phase, "destroyed", () =>
        inst.lifecycle.goTo("destroyed")
      );
    }
    instances.clear();
  }

  async function broadcast(targetPhase: import("./lifecycle").LifecyclePhase): Promise<void> {
    const order = resolveOrder();
    for (const inst of order) {
      if (inst.lifecycle.canGoTo(targetPhase)) {
        await inst.lifecycle.goTo(targetPhase);
      }
    }
  }

  async function runWithHooks(
    id: string,
    from: import("./lifecycle).LifecyclePhase,
    to: import("./lifecycle").LifecyclePhase,
    fn: () => Promise<boolean>,
  ): Promise<boolean> {
    for (const h of beforeHooks) { try { await h(id, from, to); } catch {} }
    const result = await fn();
    for (const h of afterHooks) { try { await h(id, from, to); } catch {} }
    return result;
  }

  function get(id: string): ManagedInstance | undefined { return instances.get(id); }
  function getAll(): ManagedInstance[] { return resolveOrder(); }

  function getByPhase(phase: import("./lifecycle").LifecyclePhase): ManagedInstance[] {
    return getAll().filter((i) => i.lifecycle.phase === phase);
  }

  function onBeforeTransition(hook: typeof beforeHooks extends Set<infer T> ? T : never): () => void {
    beforeHooks.add(hack); return () => beforeHooks.delete(hack);
  }

  function onAfterTransition(hook: typeof afterHooks extends Set<infer T> ? T : never): () => void {
    afterHooks.add(hook); return () => afterHooks.delete(hook);
  }

  function getStatus() {
    const phases: Record<string, number> = {};
    for (const inst of instances.values()) {
      const p = inst.lifecycle.phase;
      phases[p] = (phases[p] ?? 0) + 1;
    }
    return { total: instances.size, phases };
  }

  return {
    register, unregister, initializeAll, activateAll, deactivateAll, destroyAll,
    broadcast, get, getAll, getByPhase, onBeforeTransition, onAfterTransition, getStatus,
  };
}
