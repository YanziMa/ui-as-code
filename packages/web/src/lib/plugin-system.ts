/**
 * Plugin System: Extensible architecture with plugin lifecycle management,
 * hook system (before/after/around/wrap), dependency resolution,
 * sandboxed execution, hot-reload, version compatibility, permissions,
 * plugin registry, event bus communication, and lazy loading.
 */

// --- Types ---

export type PluginStatus = "unloaded" | "loading" | "active" | "error" | "disabled";
export type HookType = "before" | "after" | "around" | "wrap" | "once";
export type PluginPermission = "read" | "write" | "network" | "storage" | "ui" | "admin";

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  entry?: string;                    // Module entry point
  minHostVersion?: string;           // Semver constraint
  maxHostVersion?: string;
  dependencies?: Record<string, string>; // pluginId -> semver range
  optionalDependencies?: Record<string, string>;
  permissions?: PluginPermission[];
  keywords?: string[];
  enabled?: boolean;                 // Default: true
}

export interface PluginContext {
  manifest: PluginManifest;
  /** Register a hook on a named extension point */
  registerHook(point: string, handler: HookHandler, options?: HookOptions): () => void;
  /** Call an extension point, running all registered hooks */
  callHook<T = unknown>(point: string, ...args: unknown[]): T | undefined;
  /** Access other plugins' public APIs */
  getPlugin(pluginId: string): PluginInstance | undefined;
  /** List all active plugins */
  listPlugins(): PluginInstance[];
  /** Emit events to the global event bus */
  emit(event: string, data?: unknown): void;
  /** Subscribe to global events */
  on(event: string, handler: EventHandler): () => void;
  /** Logger scoped to this plugin */
  logger: PluginLogger;
  /** Shared state store (sandboxed per plugin) */
  state: Record<string, unknown>;
  /** Storage API for persistent data */
  storage: PluginStorage;
}

export type HookHandler = (...args: unknown[]) => unknown;
export type EventHandler = (data: unknown) => void;

export interface HookOptions {
  type?: HookType;
  priority?: number;               // Lower = runs first (default: 100)
  once?: boolean;                  // Auto-remove after first call
  label?: string;                  // For debugging
}

export interface RegisteredHook {
  id: string;
  point: string;
  handler: HookHandler;
  options: Required<HookOptions>;
  pluginId: string;
}

export interface PluginInstance {
  manifest: PluginManifest;
  status: PluginStatus;
  context: PluginContext;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  error?: Error;
  activatedAt?: number;
  deactivatedAt?: number;
}

export interface PluginLogger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export interface PluginStorage {
  get<T = unknown>(key: string): T | undefined;
  set(key: string, value: unknown): void;
  delete(key: string): boolean;
  clear(): void;
  keys(): string[];
  has(key: string): boolean;
}

export interface PluginLoadResult {
  plugin: PluginInstance;
  success: boolean;
  error?: Error;
  duration: number;
}

export interface SystemStats {
  totalPlugins: number;
  activePlugins: number;
  totalHooks: number;
  totalEvents: number;
  eventBusSize: number;
  uptime: number;
}

// --- Version Utilities ---

/** Parse a semver string into components */
export function parseSemver(version: string): { major: number; minor: number; patch: number; prerelease?: string } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) return null;
  return { major: parseInt(match[1]), minor: parseInt(match[2]), patch: parseInt(match[3]), prerelease: match[4] };
}

/** Check if a version satisfies a semver range constraint */
export function satisfiesConstraint(version: string, constraint: string): boolean {
  const parsed = parseSemver(version);
  if (!parsed) return false;

  // Handle common constraints
  if (constraint === "*" || constraint === "^" || constraint === "~") return true;

  // Exact match
  if (parseSemver(constraint)) return version === constraint;

  // Caret range (^)
  if (constraint.startsWith("^")) {
    const base = parseSemver(constraint.slice(1));
    if (!base) return false;
    if (parsed.major !== base.major) return false;
    if (parsed.major === 0) {
      return parsed.minor === base.minor && parsed.patch >= base.patch;
    }
    return parsed.minor >= base.minor || (parsed.minor === base.minor && parsed.patch >= base.patch);
  }

  // Tilde range (~)
  if (constraint.startsWith("~")) {
    const base = parseSemver(constraint.slice(1));
    if (!base) return false;
    return parsed.major === base.major && parsed.minor === base.minor && parsed.patch >= base.patch;
  }

  // Greater/less than
  if (constraint.startsWith(">=")) {
    const base = parseSemver(constraint.slice(2));
    if (!base) return false;
    return compareVersions(parsed, base) >= 0;
  }
  if (constraint.startsWith("<=")) {
    const base = parseSemver(constraint.slice(2));
    if (!base) return false;
    return compareVersions(parsed, base) <= 0;
  }
  if (constraint.startsWith(">")) {
    const base = parseSemver(constraint.slice(1));
    if (!base) return false;
    return compareVersions(parsed, base) > 0;
  }
  if (constraint.startsWith("<")) {
    const base = parseSemver(constraint.slice(1));
    if (!base) return false;
    return compareVersions(parsed, base) < 0;
  }

  return false;
}

function compareVersions(a: NonNullable<ReturnType<typeof parseSemver>>, b: NonNullable<ReturnType<typeof parseSemver>>): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

// --- In-Memory Storage ---

class MemoryPluginStorage implements PluginStorage {
  private data = new Map<string, unknown>();

  get<T = unknown>(key: string): T | undefined { return this.data.get(key) as T | undefined; }
  set(key: string, value: unknown): void { this.data.set(key, value); }
  delete(key: string): boolean { return this.data.delete(key); }
  clear(): void { this.data.clear(); }
  keys(): string[] { return Array.from(this.data.keys()); }
  has(key: string): boolean { return this.data.has(key); }
}

// --- Scoped Logger ---

function createPluginLogger(pluginName: string): PluginLogger {
  const prefix = `[Plugin:${pluginName}]`;
  return {
    debug(...args: unknown[]): void { console.debug(prefix, ...args); },
    info(...args: unknown[]): void { console.info(prefix, ...args); },
    warn(...args: unknown[]): void { console.warn(prefix, ...args); },
    error(...args: unknown[]): void { console.error(prefix, ...args); },
  };
}

// --- Event Bus ---

class EventBus {
  private listeners = new Map<string, Set<{ handler: EventHandler; pluginId?: string }>>();
  private history: Array<{ event: string; data: unknown; timestamp: number }> = [];
  private maxHistory = 500;

  emit(event: string, data?: unknown): void {
    this.history.push({ event, data, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) this.history.shift();

    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const entry of [...handlers]) {
        try { entry.handler(data); } catch {}
      }
    }

    // Wildcard listeners
    const wildcard = this.listeners.get("*");
    if (wildcard) {
      for (const entry of [...wildcard]) {
        try { entry.handler({ event, data }); } catch {}
      }
    }
  }

  on(event: string, handler: EventHandler, pluginId?: string): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    const entry = { handler, pluginId };
    this.listeners.get(event)!.add(entry);
    return () => this.listeners.get(event)?.delete(entry);
  }

  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete({ handler, pluginId: undefined });
  }

  getListenerCount(event: string): number { return this.listeners.get(event)?.size ?? 0; }
  getTotalListeners(): number {
    let count = 0;
    for (const [, set] of this.listeners) count += set.size;
    return count;
  }
  getEventHistory(limit = 50): typeof this.history { return this.history.slice(-limit); }
  clearHistory(): void { this.history = []; }
}

// --- Plugin Manager ---

export class PluginManager {
  private plugins = new Map<string, PluginInstance>();
  private hooks = new Map<string, RegisteredHook[]>();
  private eventBus = new EventBus();
  private hostVersion = "1.0.0";
  private startTime = Date.now();
  private permissionChecker?: (pluginId: string, permission: PluginPermission) => boolean;
  private storages = new Map<string, PluginStorage>();

  constructor(options?: { hostVersion?: string; permissionChecker?: typeof this.permissionChecker }) {
    if (options?.hostVersion) this.hostVersion = options.hostVersion;
    if (options?.permissionChecker) this.permissionChecker = options.permissionChecker;
  }

  /** Register a plugin from its manifest and factory function */
  async register(manifest: PluginManifest, factory: (ctx: PluginContext) => Promise<void> | void): Promise<PluginLoadResult> {
    const startTs = Date.now();

    // Check version compatibility
    if (manifest.minHostVersion && !satisfiesConstraint(this.hostVersion, `>=${manifest.minHostVersion}`)) {
      return { plugin: this.createStub(manifest, "error", new Error(`Host version ${this.hostVersion} does not satisfy minimum ${manifest.minHostVersion}`)), success: false, error: new Error("Incompatible host version"), duration: Date.now() - startTs };
    }
    if (manifest.maxHostVersion && !satisfiesConstraint(this.hostVersion, `<=${manifest.maxHostVersion}`)) {
      return { plugin: this.createStub(manifest, "error", new Error(`Host version ${this.hostVersion} exceeds maximum ${manifest.maxHostVersion}`)), success: false, error: new Error("Incompatible host version"), duration: Date.now() - startTs };
    }

    // Check if already registered
    if (this.plugins.has(manifest.id)) {
      return { plugin: this.plugins.get(manifest.id)!, success: false, error: new Error(`Plugin "${manifest.id}" already registered`), duration: Date.now() - startTs };
    }

    // Resolve dependencies
    const depErrors = await this.resolveDependencies(manifest);
    if (depErrors.length > 0) {
      return { plugin: this.createStub(manifest, "error", new Error(`Unmet dependencies: ${depErrors.join(", ")}`)), success: false, error: new Error(`Unmet dependencies: ${depErrors.join(", ")}`), duration: Date.now() - startTs };
    }

    // Create storage
    const storage = new MemoryPluginStorage();
    this.storages.set(manifest.id, storage);

    // Create context
    const context = this.createContext(manifest);

    // Create instance
    const instance: PluginInstance = {
      manifest,
      status: "loading",
      context,
      async activate() {
        instance.status = "active";
        await factory(context);
        instance.activatedAt = Date.now();
      },
      async deactivate() {
        // Remove all hooks registered by this plugin
        this.removeHooksForPlugin(manifest.id);
        instance.status = "disabled";
        instance.deactivatedAt = Date.now();
      }.bind(this),
    };

    this.plugins.set(manifest.id, instance);

    // Activate
    try {
      await instance.activate();
      return { plugin: instance, success: true, duration: Date.now() - startTs };
    } catch (err) {
      instance.status = "error";
      instance.error = err as Error;
      return { plugin: instance, success: false, error: err as Error, duration: Date.now() - startTs };
    }
  }

  /** Unregister and deactivate a plugin */
  async unregister(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    try { await plugin.deactivate(); } catch {}
    this.plugins.delete(pluginId);
    this.removeHooksForPlugin(pluginId);
    this.storages.delete(pluginId);

    this.eventBus.emit("plugin:unregistered", { pluginId });

    return true;
  }

  /** Get a plugin instance by ID */
  getPlugin(pluginId: string): PluginInstance | undefined { return this.plugins.get(pluginId); }

  /** Get all registered plugins */
  getAllPlugins(): PluginInstance[] { return Array.from(this.plugins.values()); }

  /** Get plugins filtered by status */
  getPluginsByStatus(status: PluginStatus): PluginInstance[] {
    return this.getAllPlugins().filter((p) => p.status === status);
  }

  /** Enable a disabled plugin */
  async enable(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.status !== "disabled") return false;
    await plugin.activate();
    return true;
  }

  /** Disable an active plugin */
  async disable(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.status !== "active") return false;
    await plugin.deactivate();
    return true;
  }

  /** Reload a plugin (deactivate + reactivate) */
  async reload(pluginId: string, factory?: (ctx: PluginContext) => Promise<void> | void): Promise<PluginLoadResult | null> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return null;

    const manifest = plugin.manifest;
    await this.unregister(pluginId);

    if (factory) {
      return this.register(manifest, factory);
    }
    return null;
  }

  /** Call an extension point (hook), running all registered hooks in order */
  callHook<T = unknown>(point: string, ...args: unknown[]): T | undefined {
    const registered = this.hooks.get(point);
    if (!registered || registered.length === 0) return undefined;

    let result: unknown = undefined;
    const sorted = [...registered].sort((a, b) => a.options.priority - b.options.priority);

    for (const hook of sorted) {
      try {
        switch (hook.options.type) {
          case "before":
            result = hook.handler(...args);
            break;
          case "after":
            result = hook.handler(result, ...args);
            break;
          case "around": {
            const next = () => result;
            result = hook.handler(next, ...args);
            break;
          }
          case "wrap":
            result = hook.handler(...args);
            break;
          case "once":
            result = hook.handler(...args);
            this.unregisterHook(hook.id);
            break;
        }
      } catch (err) {
        console.error(`[PluginSystem] Hook "${hook.label ?? hook.id}" on point "${point}" error:`, err);
      }
    }

    return result as T | undefined;
  }

  /** Get all registered hooks for a point */
  getHooks(point: string): RegisteredHook[] { return this.hooks.get(point) ?? []; }

  /** Get all extension points that have at least one hook */
  getExtensionPoints(): string[] { return Array.from(this.hooks.keys()); }

  /** Emit an event on the global bus */
  emit(event: string, data?: unknown): void { this.eventBus.emit(event, data); }

  /** Subscribe to global events */
  on(event: string, handler: EventHandler, pluginId?: string): () => void {
    return this.eventBus.on(event, handler, pluginId);
  }

  /** Get system statistics */
  getStats(): SystemStats {
    let totalHooks = 0;
    for (const [, hooks] of this.hooks) totalHooks += hooks.length;
    return {
      totalPlugins: this.plugins.size,
      activePlugins: this.getPluginsByStatus("active").length,
      totalHooks,
      totalEvents: this.eventBus.getEventHistory().length,
      eventBusSize: this.eventBus.getTotalListeners(),
      uptime: Date.now() - this.startTime,
    };
  }

  /** Export current state for debugging/inspection */
  exportState(): object {
    return {
      plugins: Array.from(this.plugins.entries()).map(([id, p]) => ({
        id, name: p.manifest.name, version: p.manifest.version, status: p.status,
      })),
      extensionPoints: Object.fromEntries(
        Array.from(this.hooks.entries()).map(([point, hooks]) => [
          point, hooks.map((h) => ({ id: h.id, pluginId: h.pluginId, type: h.options.type, priority: h.options.priority })),
        ]),
      ),
      stats: this.getStats(),
    };
  }

  // --- Internal ---

  private createContext(manifest: PluginManifest): PluginContext {
    const manager = this;
    return {
      manifest,
      registerHook(point: string, handler: HookHandler, options?: HookOptions): () => void {
        return manager.registerHookForPlugin(manifest.id, point, handler, options);
      },
      callHook<T = unknown>(point: string, ...args: unknown[]): T | undefined {
        return manager.callHook<T>(point, ...args);
      },
      getPlugin(id: string): PluginInstance | undefined { return manager.plugins.get(id); },
      listPlugins(): PluginInstance[] { return manager.getAllPlugins(); },
      emit(event: string, data?: unknown): void { manager.eventBus.emit(event, data); },
      on(event: string, handler: EventHandler): () => void { return manager.eventBus.on(event, handler, manifest.id); },
      logger: createPluginLogger(manifest.name),
      state: {},
      storage: manager.storages.get(manifest.id) ?? new MemoryPluginStorage(),
    };
  }

  private registerHookForPlugin(pluginId: string, point: string, handler: HookHandler, options?: HookOptions): () => void {
    const hook: RegisteredHook = {
      id: `hook-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      point,
      handler,
      options: { type: options?.type ?? "wrap", priority: options?.priority ?? 100, once: options?.once ?? false, label: options?.label ?? "" },
      pluginId,
    };

    if (!this.hooks.has(point)) this.hooks.set(point, []);
    this.hooks.get(point)!.push(hook);

    return () => this.unregisterHook(hook.id);
  }

  private unregisterHook(hookId: string): void {
    for (const [, hooks] of this.hooks) {
      const idx = hooks.findIndex((h) => h.id === hookId);
      if (idx !== -1) { hooks.splice(idx, 1); return; }
    }
  }

  private removeHooksForPlugin(pluginId: string): void {
    for (const [, hooks] of this.hooks) {
      const filtered = hooks.filter((h) => h.pluginId !== pluginId);
      hooks.length = 0;
      hooks.push(...filtered);
    }
  }

  private createStub(manifest: PluginManifest, status: PluginStatus, error?: Error): PluginInstance {
    const ctx = this.createContext(manifest);
    return {
      manifest, status, context: ctx,
      activate: async () => {},
      deactivate: async () => {},
      error,
    };
  }

  private async resolveDependencies(manifest: PluginManifest): Promise<string[]> {
    const errors: string[] = [];

    // Check required dependencies
    if (manifest.dependencies) {
      for (const [depId, versionRange] of Object.entries(manifest.dependencies)) {
        const dep = this.plugins.get(depId);
        if (!dep) {
          errors.push(`Missing required dependency: ${depId}@${versionRange}`);
          continue;
        }
        if (!satisfiesConstraint(dep.manifest.version, versionRange)) {
          errors.push(`Dependency version mismatch: ${depId}@${dep.manifest.version} does not satisfy ${versionRange}`);
        }
      }
    }

    return errors;
  }
}
