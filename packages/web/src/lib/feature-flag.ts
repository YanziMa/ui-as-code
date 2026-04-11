/**
 * Feature Flag: Lightweight client-side feature flag system with boolean flags,
 * percentage rollouts, user targeting, A/B test variants, local overrides,
 * change subscriptions, and persistence.
 */

// --- Types ---

export type FlagValue = boolean | string | number;
export type RolloutStrategy = "boolean" | "percentage" | "variant" | "user-list";

export interface FeatureFlagDef {
  /** Unique flag key */
  key: string;
  /** Display name */
  name?: string;
  /** Default value */
  defaultValue: FlagValue;
  /** Description */
  description?: string;
  /** Owner/team */
  owner?: string;
  /** Tags for grouping */
  tags?: string[];
}

export interface PercentageRollout {
  /** Percentage of users who see the flag enabled (0-100) */
  percent: number;
  /** Value when user is in rollout */
  enabledValue?: FlagValue;
  /** Value when user is not in rollout */
  disabledValue?: FlagValue;
}

export interface VariantRollout {
  /** Map of variant names to their allocation percentages (must sum to 100) */
  variants: Record<string, number>;
}

export interface UserListRollout {
  /** Set of user IDs that should see the flag as enabled */
  userIds: Set<string> | string[];
  /** Value for matched users */
  value?: FlagValue;
}

export interface TargetingRule {
  strategy: RolloutRule;
  /** Optional condition: only apply if this function returns true */
  condition?: (context: FlagContext) => boolean;
}

export type RolloutRule =
  | { type: "boolean"; value: boolean }
  | { type: "percentage"; config: PercentageRollout }
  | { type: "variant"; config: VariantRollout }
  | { type: "user-list"; config: UserListRollout };

export interface FlagContext {
  /** Current user ID */
  userId: string;
  /** Additional attributes for targeting */
  attributes?: Record<string, unknown>;
  /** Custom segments */
  segments?: string[];
  /** Override key for deterministic bucketing */
  bucketingKey?: string;
}

export interface FeatureFlagSystemOptions {
  /** Initial flag definitions */
  flags?: FeatureFlagDef[];
  /** Default context for evaluation */
  defaultContext?: FlagContext;
  /** Persist overrides to localStorage? */
  persistOverrides?: boolean;
  /** Storage key prefix */
  storagePrefix?: string;
  /** Enable console logging */
  debug?: boolean;
  /** Called when any flag value changes */
  onFlagChange?: (key: string, oldValue: FlagValue, newValue: FlagValue) => void;
}

export interface FeatureFlagSystem {
  /** Evaluate a flag's current value */
  evaluate(key: string): FlagValue;
  /** Check if a boolean flag is truthy */
  isEnabled(key: string): boolean;
  /** Get the variant name for a variant-type flag */
  getVariant(key: string): string | null;
  /** Get all evaluated flag values */
  getAllFlags(): Record<string, FlagValue>;
  /** Register or update a flag definition */
  define(def: FeatureFlagDef): void;
  /** Remove a flag definition */
  remove(key: string): void;
  /** Set a rollout/targeting rule for a flag */
  setRule(key: string, rule: TargetingRule): void;
  /** Clear the rule for a flag */
  clearRule(key: string): void;
  /** Override a flag locally (for testing/development) */
  override(key: string, value: FlagValue): void;
  /** Remove a local override */
  clearOverride(key: string): void;
  /** Clear all overrides */
  clearAllOverrides(): void;
  /** Update the evaluation context */
  setContext(ctx: Partial<FlagContext>): void;
  /** Get current context */
  getContext(): FlagContext;
  /** Subscribe to changes for a specific flag */
  subscribe(key: string, callback: (value: FlagValue) => void): () => void;
  /** Get all registered definitions */
  getDefinitions(): FeatureFlagDef[];
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Internal State ---

interface InternalFlag {
  def: FeatureFlagDef;
  rule?: TargetingRule;
  override?: FlagValue;
}

// --- Deterministic Hash ---

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getBucket(userId: string, flagKey: string, buckets: number): number {
  return hashString(`${userId}:${flagKey}`) % buckets;
}

// --- Main System ---

export function createFeatureFlagSystem(options: FeatureFlagSystemOptions = {}): FeatureFlagSystem {
  const {
    persistOverrides = true,
    storagePrefix = "ff_",
    debug = false,
    onFlagChange,
  } = options;

  const flags = new Map<string, InternalFlag>();
  const rules = new Map<string, TargetingRule>();
  const subscribers = new Map<string, Set<(value: FlagValue) => void>>();

  // Initialize with provided flags
  for (const def of options.flags ?? []) {
    flags.set(def.key, { def });
  }

  // Context
  let context: FlagContext = options.defaultContext ?? { userId: "" };

  // Load persisted overrides
  const overrides = new Map<string, FlagValue>();

  function loadOverrides(): void {
    if (!persistOverrides || typeof localStorage === "undefined") return;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(storagePrefix)) {
          const flagKey = k.slice(storagePrefix.length);
          try { overrides.set(flagKey, JSON.parse(localStorage.getItem(k)!)); } catch {}
        }
      }
    } catch {}
  }

  function saveOverride(key: string, value: FlagValue): void {
    if (!persistOverrides || typeof localStorage === "undefined") return;
    try { localStorage.setItem(storagePrefix + key, JSON.stringify(value)); } catch {}
  }

  function removeOverrideStorage(key: string): void {
    if (!persistOverrides || typeof localStorage === "undefined") return;
    try { localStorage.removeItem(storagePrefix + key); } catch {}
  }

  loadOverrides();

  // --- Evaluation ---

  function evaluate(key: string): FlagValue {
    const internal = flags.get(key);

    // Check override first
    if (overrides.has(key)) {
      const val = overrides.get(key)!;
      if (debug) console.log(`[FeatureFlag] "${key}" = ${JSON.stringify(val)} (override)`);
      return val;
    }

    // Unknown flag
    if (!internal) {
      if (debug) console.log(`[FeatureFlag] "${key}" = false (unknown)`);
      return false;
    }

    // Check rule
    const rule = rules.get(key);
    if (rule) {
      if (rule.condition && !rule.condition(context)) {
        // Condition failed — fall through to default
      } else {
        const result = evaluateRule(rule.strategy, key);
        if (result !== undefined) {
          if (debug) console.log(`[FeatureFlag] "${key}" = ${JSON.stringify(result)} (rule)`);
          return result;
        }
      }
    }

    // Default value
    if (debug) console.log(`[FeatureFlag] "${key}" = ${JSON.stringify(internal.def.defaultValue)} (default)`);
    return internal.def.defaultValue;
  }

  function evaluateRule(rule: RolloutRule, flagKey: string): FlagValue | undefined {
    switch (rule.type) {
      case "boolean":
        return rule.value;

      case "percentage": {
        const cfg = rule.config;
        const bucket = getBucket(context.userId, flagKey, 100);
        const inRollout = bucket < cfg.percent;
        return inRollout
          ? (cfg.enabledValue ?? true)
          : (cfg.disabledValue ?? cfg.enabledValue ?? false);
      }

      case "variant": {
        const cfg = rule.config;
        const totalWeight = Object.values(cfg.variants).reduce((a, b) => a + b, 0);
        if (totalWeight !== 100) {
          if (debug) console.warn(`[FeatureFlag] Variant weights sum to ${totalWeight}, expected 100`);
        }
        const bucket = getBucket(context.userId, flagKey, 100);
        let cumulative = 0;
        for (const [name, weight] of Object.entries(cfg.variants)) {
          cumulative += weight;
          if (bucket < cumulative) return name;
        }
        // Fallback to first variant
        return Object.keys(cfg.variants)[0] ?? null;
      }

      case "user-list": {
        const cfg = rule.config;
        const ids = cfg.userIds instanceof Set ? Array.from(cfg.userIds) : cfg.userIds;
        const matched = ids.includes(context.userId);
        return matched ? (cfg.value ?? true) : false;
    }
    }
  }

  function notify(key: string, value: FlagValue): void {
    const subs = subscribers.get(key);
    if (subs) {
      for (const cb of subs) {
        try { cb(value); } catch {}
      }
    }
  }

  // --- Public API ---

  return {
    evaluate,
    isEnabled(key: string): boolean { return !!evaluate(key); },
    getVariant(key: string): string | null {
      const val = evaluate(key);
      return typeof val === "string" ? val : null;
    },
    getAllFlags(): Record<string, FlagValue> {
      const result: Record<string, FlagValue> = {};
      for (const [key] of flags) result[key] = evaluate(key);
      return result;
    },

    define(def: FeatureFlagDef): void {
      const existing = flags.get(def.key);
      const oldVal = existing ? evaluate(def.key) : undefined;
      flags.set(def.key, { def, override: overrides.get(def.key) });
      const newVal = evaluate(def.key);
      if (oldVal !== newVal) onFlagChange?.(def.key, oldVal!, newVal);
    },

    remove(key: string): void {
      flags.delete(key);
      rules.delete(key);
      subscribers.delete(key);
      overrides.delete(key);
      removeOverrideStorage(key);
    },

    setRule(key: string, rule: TargetingRule): void {
      const oldVal = evaluate(key);
      rules.set(key, rule);
      const newVal = evaluate(key);
      if (oldVal !== newVal) {
        onFlagChange?.(key, oldVal, newVal);
        notify(key, newVal);
      }
    },

    clearRule(key: string): void {
      const oldVal = evaluate(key);
      rules.delete(key);
      const newVal = evaluate(key);
      if (oldVal !== newVal) {
        onFlagChange?.(key, oldVal, newVal);
        notify(key, newVal);
      }
    },

    override(key: string, value: FlagValue): void {
      const oldVal = evaluate(key);
      overrides.set(key, value);
      saveOverride(key, value);
      const newVal = evaluate(key);
      if (oldVal !== newVal) {
        onFlagChange?.(key, oldVal, newVal);
        notify(key, newVal);
      }
    },

    clearOverride(key: string): void {
      if (!overrides.has(key)) return;
      overrides.delete(key);
      removeOverrideStorage(key);
      const newVal = evaluate(key);
      notify(key, newVal);
    },

    clearAllOverrides(): void {
      for (const [key] of overrides) {
        removeOverrideStorage(key);
      }
      overrides.clear();
    },

    setContext(ctx: Partial<FlagContext>): void {
      context = { ...context, ...ctx };
    },

    getContext(): FlagContext { return { ...context }; },

    subscribe(key: string, callback: (value: FlagValue) => void): () => void {
      if (!subscribers.has(key)) subscribers.set(key, new Set());
      subscribers.get(key)!.add(callback);
      callback(evaluate(key));
      return () => { subscribers.get(key)?.delete(callback); };
    },

    getDefinitions(): FeatureFlagDef[] {
      return Array.from(flags.values()).map((f) => f.def);
    },

    destroy(): void {
      flags.clear();
      rules.clear();
      subscribers.clear();
      overrides.clear();
    },
  };
}

// --- Convenience Builders ---

/** Create a simple boolean feature flag definition */
export function boolFlag(
  key: string,
  defaultValue = false,
  extras?: Partial<Omit<FeatureFlagDef, "key" | "defaultValue">>,
): FeatureFlagDef {
  return { key, defaultValue, ...extras };
}

/** Create a percentage rollout rule */
export function percentRollout(
  percent: number,
  enabledValue: FlagValue = true,
  disabledValue: FlagValue = false,
): TargetingRule {
  return {
    strategy: { type: "percentage", config: { percent, enabledValue, disabledValue } },
  };
}

/** Create an A/B variant rollout rule */
export function abTest(
  variants: Record<string, number>,
): TargetingRule {
  return { strategy: { type: "variant", config: { variants } } };
}

/** Create a user-list allowlist rule */
export function userList(
  userIds: string[] | Set<string>,
  value: FlagValue = true,
): TargetingRule {
  return { strategy: { type: "user-list", config: { userIds, value } } };
}
