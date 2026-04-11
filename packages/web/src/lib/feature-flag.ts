/**
 * Feature Flag System: Client-side feature flag management with targeting rules,
 * A/B testing support, rollout percentages, user segmentation, override storage,
 * change subscriptions, and remote sync capabilities.
 */

// --- Types ---

export type FlagValueType = boolean | string | number | Record<string, unknown>;
export type FlagConditionOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "not_in" | "contains" | "starts_with" | "ends_with" | "regex" | "exists";

export interface FlagCondition {
  /** Attribute name to check (e.g., "role", "plan", "country") */
  attribute: string;
  /** Comparison operator */
  operator: FlagConditionOperator;
  /** Value(s) to compare against */
  value: unknown;
}

export interface FlagRule {
  /** Rule identifier */
  id: string;
  /** Human-readable name */
  name?: string;
  /** Conditions that must all match (AND logic) */
  conditions: FlagCondition[];
  /** Value when this rule matches */
  value: FlagValueType;
  /** Rollout percentage for this rule (0-100, default: 100) */
  rollout?: number;
  /** Priority (higher = evaluated first) */
  priority?: number;
}

export interface FeatureFlag {
  /** Unique key */
  key: string;
  /** Human-readable name */
  name?: string;
  /** Description */
  description?: string;
  /** Default value when no rules match */
  defaultValue: FlagValueType;
  /** Targeting rules (evaluated in priority order) */
  rules?: FlagRule[];
  /** Whether this flag is enabled globally */
  enabled?: boolean;
  /** Created timestamp */
  createdAt?: number;
  /** Tags for organization */
  tags?: string[];
}

export interface UserContext {
  /** Unique user ID */
  userId: string;
  /** Optional attributes for targeting */
  attributes?: Record<string, unknown>;
  /** Custom segments the user belongs to */
  segments?: string[];
}

export interface FeatureFlagOptions {
  /** Initial flags to load */
  flags?: FeatureFlag[];
  /** Default context for evaluation */
  defaultContext?: UserContext;
  /** Persist overrides in localStorage? */
  persistOverrides?: boolean;
  /** Storage key prefix */
  storagePrefix?: string;
  /** Enable change logging? */
  enableLogging?: boolean;
  /** Auto-track flag evaluations? */
  trackEvaluations?: boolean;
  /** Callback on flag value changes */
  onChange?: (key: string, oldValue: FlagValueType, newValue: FlagValueType) => void;
}

export interface FeatureFlagInstance {
  /** Evaluate a flag's value for current context */
  getValue: <T extends FlagValueType = FlagValueType>(key: string) => T;
  /** Check if a boolean flag is enabled */
  isEnabled: (key: string) => boolean;
  /** Get all flag values as a record */
  getAllValues: () => Record<string, FlagValueType>;
  /** Set/override a flag value locally */
  setOverride: (key: string, value: FlagValueType) => void;
  /** Remove a local override */
  removeOverride: (key: string) => void;
  /** Clear all local overrides */
  clearOverrides: () => void;
  /** Set user context */
  setContext: (context: UserContext) => void;
  /** Get current context */
  getContext: () => UserContext;
  /** Add or update a flag definition */
  defineFlag: (flag: FeatureFlag) => void;
  /** Remove a flag definition */
  removeFlag: (key: string) => void;
  /** Subscribe to flag changes */
  subscribe: (key: string, callback: (value: FlagValueType) => void) => () => void;
  /** Load flags from remote source */
  loadRemoteFlags: (fetcher: () => Promise<FeatureFlag[]>) => Promise<void>;
  /** Get all flag definitions */
  getFlags: () => FeatureFlag[];
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Evaluation Engine ---

function evaluateCondition(condition: FlagCondition, ctx: UserContext): boolean {
  const attrValue = condition.attribute === "userId"
    ? ctx.userId
    : ctx.attributes?.[condition.attribute];

  const op = condition.operator;
  const cmpVal = condition.value;

  switch (op) {
    case "exists":
      return attrValue !== undefined && attrValue !== null;

    case "eq":
      return attrValue === cmpVal;

    case "neq":
      return attrValue !== cmpVal;

    case "gt":
      return typeof attrValue === "number" && typeof cmpVal === "number" && attrValue > cmpVal;

    case "gte":
      return typeof attrValue === "number" && typeof cmpVal === "number" && attrValue >= cmpVal;

    case "lt":
      return typeof attrValue === "number" && typeof cmpVal === "number" && attrValue < cmpVal;

    case "lte":
      return typeof attrValue === "number" && typeof cmpVal === "number" && attrValue <= cmpVal;

    case "in":
      return Array.isArray(cmpVal) && cmpVal.includes(attrValue);

    case "not_in":
      return Array.isArray(cmpVal) && !cmpVal.includes(attrValue);

    case "contains":
      return typeof attrValue === "string" && String(cmpVal).includes(attrValue);

    case "starts_with":
      return typeof attrValue === "string" && attrValue.startsWith(String(cmpVal));

    case "ends_with":
      return typeof attrValue === "string" && attrValue.endsWith(String(cmpVal));

    case "regex":
      if (typeof attrValue !== "string") return false;
      try { return new RegExp(String(cmpVal)).test(attrValue); }
      catch { return false; }

    default:
      return false;
  }
}

function matchesAllConditions(conditions: FlagCondition[], ctx: UserContext): boolean {
  return conditions.every((c) => evaluateCondition(c, ctx));
}

/** Deterministic hash for rollout bucketing */
function hashToBucket(userId: string, flagKey: string, buckets: number): number {
  let hash = 0;
  const str = `${userId}:${flagKey}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash) % buckets;
}

// --- Main Factory ---

export function createFeatureFlags(options: FeatureFlagOptions = {}): FeatureFlagInstance {
  const opts = {
    persistOverrides: options.persistOverrides ?? true,
    storagePrefix: options.storagePrefix ?? "ff_",
    enableLogging: options.enableLogging ?? false,
    trackEvaluations: options.trackEvaluations ?? false,
    ...options,
  };

  // Flag store
  const flagMap = new Map<string, FeatureFlag>();
  for (const f of options.flags ?? []) {
    flagMap.set(f.key, f);
  }

  // Local overrides
  const overrides = new Map<string, FlagValueType>();

  // Context
  let context: UserContext = opts.defaultContext ?? { userId: "" };

  // Subscribers
  const subscribers = new Map<string, Set<(value: FlagValueType) => void>>();

  // Load persisted overrides
  function loadPersistedOverrides(): void {
    if (!opts.persistOverrides || typeof localStorage === "undefined") return;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(opts.storagePrefix)) {
          const flagKey = key.slice(opts.storagePrefix.length);
          const raw = localStorage.getItem(key);
          if (raw) {
            try { overrides.set(flagKey, JSON.parse(raw)); } catch {}
          }
        }
      }
    } catch {}
  }

  function persistOverride(key: string, value: FlagValueType): void {
    if (!opts.persistOverrides || typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(opts.storagePrefix + key, JSON.stringify(value));
    } catch {}
  }

  function removePersistedOverride(key: string): void {
    if (!opts.persistOverrides || typeof localStorage === "undefined") return;
    try { localStorage.removeItem(opts.storagePrefix + key); } catch {}
  }

  // Initialize
  loadPersistedOverrides();

  function evaluateFlag(key: string): FlagValueType {
    const flag = flagMap.get(key);

    // Check override first
    if (overrides.has(key)) {
      const val = overrides.get(key)!;
      logEval(key, val, "override");
      return val;
    }

    // Unknown flag
    if (!flag) {
      logEval(key, undefined, "unknown");
      return false;
    }

    // Globally disabled
    if (flag.enabled === false) {
      logEval(key, flag.defaultValue, "disabled");
      return flag.defaultValue;
    }

    // No rules — return default
    if (!flag.rules || flag.rules.length === 0) {
      logEval(key, flag.defaultValue, "default");
      return flag.defaultValue;
    }

    // Sort rules by priority (descending)
    const sortedRules = [...flag.rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    // Evaluate each rule
    for (const rule of sortedRules) {
      // Check conditions
      if (rule.conditions.length > 0 && !matchesAllConditions(rule.conditions, context)) {
        continue;
      }

      // Check rollout percentage
      const rollout = rule.rollout ?? 100;
      if (rollout < 100) {
        const bucket = hashToBucket(context.userId, `${key}:${rule.id}`, 100);
        if (bucket >= rollout) {
          continue; // Not in rollout
        }
      }

      logEval(key, rule.value, `rule:${rule.id}`);
      return rule.value;
    }

    // No rules matched — return default
    logEval(key, flag.defaultValue, "default");
    return flag.defaultValue;
  }

  function logEval(key: string, value: FlagValueType, reason: string): void {
    if (!opts.enableLogging) return;
    console.log(`[FeatureFlag] ${key} = ${JSON.stringify(value)} (${reason})`);
  }

  function notifyChange(key: string, value: FlagValueType): void {
    const subs = subscribers.get(key);
    if (subs) {
      for (const cb of subs) {
        try { cb(value); } catch {}
      }
    }
  }

  const instance: FeatureFlagInstance = {
    getValue<T extends FlagValueType = FlagValueType>(key: string): T {
      return evaluateFlag(key) as T;
    },

    isEnabled(key: string): boolean {
      return !!evaluateFlag(key);
    },

    getAllValues(): Record<string, FlagValueType> {
      const result: Record<string, FlagValueType> = {};
      for (const [key] of flagMap) {
        result[key] = evaluateFlag(key);
      }
      return result;
    },

    setOverride(key: string, value: FlagValueType): void {
      const oldVal = overrides.has(key) ? overrides.get(key)! : evaluateFlag(key);
      overrides.set(key, value);
      persistOverride(key, value);
      opts.onChange?.(key, oldVal, value);
      notifyChange(key, value);
    },

    removeOverride(key: string): void {
      if (!overrides.has(key)) return;
      const oldVal = overrides.get(key)!;
      overrides.delete(key);
      removePersistedOverride(key);
      const newVal = evaluateFlag(key);
      opts.onChange?.(key, oldVal, newVal);
      notifyChange(key, newVal);
    },

    clearOverrides(): void {
      for (const [key] of overrides) {
        removePersistedOverride(key);
      }
      overrides.clear();
    },

    setContext(ctx: UserContext): void {
      context = ctx;
    },

    getContext(): UserContext {
      return { ...context };
    },

    defineFlag(flag: FeatureFlag): void {
      flagMap.set(flag.key, flag);
    },

    removeFlag(key: string): void {
      flagMap.delete(key);
      subscribers.delete(key);
    },

    subscribe(key: string, callback: (value: FlagValueType) => void): () => void {
      if (!subscribers.has(key)) {
        subscribers.set(key, new Set());
      }
      subscribers.get(key)!.add(callback);
      // Immediately call with current value
      callback(evaluateFlag(key));
      return () => { subscribers.get(key)?.delete(callback); };
    },

    async loadRemoteFlags(fetcher: () => Promise<FeatureFlag[]>): Promise<void> {
      try {
        const remoteFlags = await fetcher();
        for (const flag of remoteFlags) {
          const existing = flagMap.get(flag.key);
          const oldVal = existing ? evaluateFlag(flag.key) : undefined;
          flagMap.set(flag.key, flag);
          const newVal = evaluateFlag(flag.key);
          if (oldVal !== newVal) {
            opts.onChange?.(flag.key, oldVal!, newVal);
            notifyChange(flag.key, newVal);
          }
        }
      } catch (err) {
        if (opts.enableLogging) console.error("[FeatureFlag] Failed to load remote flags:", err);
      }
    },

    getFlags(): FeatureFlag[] {
      return Array.from(flagMap.values());
    },

    destroy() {
      overrides.clear();
      flagMap.clear();
      subscribers.clear();
    },
  };

  return instance;
}

// --- Quick Helpers ---

/** Create a simple boolean feature flag */
export function createBooleanFlag(
  key: string,
  defaultValue = false,
  options?: Partial<Pick<FeatureFlag, "name" | "description" | "tags">>,
): FeatureFlag {
  return { key, defaultValue, ...options };
}

/** Create a flag with a simple rollout percentage */
export function createRolloutFlag(
  key: string,
  defaultValue: FlagValueType,
  rolloutPercent: number,
  options?: Partial<Pick<FeatureFlag, "name" | "description" | "rules">>,
): FeatureFlag {
  return {
    key,
    defaultValue,
    rules: [{
      id: `${key}-rollout`,
      conditions: [],
      value: typeof defaultValue === "boolean" ? !defaultValue : defaultValue,
      rollout: rolloutPercent,
    }],
    ...options,
  };
}
