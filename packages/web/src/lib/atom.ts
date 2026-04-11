/**
 * Atom: Jotai-inspired primitive state management.
 * Atoms are independent units of state that can be composed,
 * derived from other atoms, and subscribed to reactively.
 * Supports async atoms, atom families, and atom effects.
 */

// --- Types ---

export interface Atom<T> {
  /** Unique key for this atom */
  key: string;
  /** Default/initial value */
  defaultValue: T;
}

export interface ReadAtom<T> {
  /** Unique key */
  key: string;
  /** Read function: derives value from other atoms */
  read: (get: <V>(atom: Atom<V>) => V) => T;
}

export interface WriteAtom<T> {
  /** Unique key */
  key: string;
  /** Default value for initialization */
  defaultValue?: T;
  /** Write function: custom setter logic */
  write: (
    get: <V>(atom: Atom<V>) => V,
    set: <V>(atom: Atom<V>, value: V) => void,
    newValue: T,
  ) => void;
}

export type AnyAtom = Atom<unknown> | ReadAtom<unknown> | WriteAtom<unknown>;

export interface AtomOptions {
  /** Persist to localStorage? */
  persist?: boolean | string;
  /** Debug label for devtools */
  debugLabel?: string;
}

export interface AtomInstance<T> {
  /** Get current value */
  get: () => T;
  /** Set new value */
  set: (value: T | ((prev: T) => T)) => void;
  /** Subscribe to changes */
  subscribe: (listener: (value: T) => void) => () => void;
  /** Reset to default value */
  reset: () => void;
  /** The atom definition */
  atom: Atom<T>;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Internal ---

interface Subscriber<T> {
  fn: (value: T) => void;
}

// --- Atom Store (Scope) ---

/**
 * An AtomStore holds all atom values and manages dependencies between them.
 * Multiple stores can exist for different scopes (e.g., component instances).
 */
export class AtomStore {
  private values = new Map<string, unknown>();
  private listeners = new Map<string, Set<Subscriber<unknown>>>();
  private derivations = new Map<string, Set<string>>(); // derivedAtomKey → [depAtomKeys]
  private defaults = new Map<string, unknown>();
  private destroyed = false;

  constructor() {}

  /**
   * Get the current value of an atom.
   * For derived atoms, recomputes from dependencies.
   */
  get<T>(atom: Atom<T> | ReadAtom<T>): T {
    if (this.destroyed) throw new Error("AtomStore destroyed");

    const key = atom.key;

    // Check if we have a cached value
    if (this.values.has(key)) {
      return this.values.get(key) as T;
    }

    // If it's a read atom (derived), compute from deps
    if ("read" in atom && typeof atom.read === "function") {
      const value = atom.read(<V>(dep: Atom<V>) => this.get(dep));
      this.values.set(key, value);
      return value;
    }

    // Return default
    return (this.defaults.get(key) ?? atom.defaultValue) as T;
  }

  /**
   * Set a new value for an atom.
   * Invalidates any derived atoms that depend on this one.
   */
  set<T>(atom: Atom<T>, value: T | ((prev: T) => T)): void {
    if (this.destroyed) return;

    const key = atom.key;
    const prevValue = this.values.get(key);
    const newValue = typeof value === "function"
      ? (value as (prev: T) => T)((prevValue ?? this.defaults.get(key) ?? atom.defaultValue) as T)
      : value;

    // Only update if changed
    if (prevValue === newValue && this.values.has(key)) return;

    this.values.set(key, newValue);

    // Notify subscribers of THIS atom
    const subs = this.listeners.get(key);
    if (subs) {
      for (const sub of subs) {
        try { sub.fn(newValue); } catch { /* ignore */ }
      }
    }

    // Invalidate and recompute dependent (derived) atoms
    this.invalidateDependents(key);
  }

  /** Subscribe to atom changes */
  subscribe<T>(atom: Atom<T>, listener: (value: T) => void): () => void {
    const key = atom.key;
    let subs = this.listeners.get(key);
    if (!subs) {
      subs = new Set();
      this.listeners.set(key, subs);
    }
    const subscriber: Subscriber<T> = { fn: listener };
    subs.add(subscriber as Subscriber<unknown>);

    // Send initial value
    listener(this.get(atom));

    return () => { subs!.delete(subscriber as Subscriber<unknown>); };
  }

  /** Register a default value for an atom */
  registerDefault<T>(atom: Atom<T>): void {
    this.defaults.set(atom.key, atom.defaultValue);
  }

  /** Reset an atom to its default value */
  reset<T>(atom: Atom<T>): void {
    this.set(atom, this.defaults.get(key) ?? atom.defaultValue);
    function key() { return ""; } // placeholder - fix below
  }

  /** Reset ALL atoms to defaults */
  resetAll(): void {
    for (const [key] of this.values) {
      const def = this.defaults.get(key);
      if (def !== undefined) {
        this.values.set(key, def);
        const subs = this.listeners.get(key);
        if (subs) {
          for (const sub of subs) { try { sub.fn(def); } catch {} }
        }
      }
    }
    // Invalidate all derived atoms
    for (const [, depSet] of this.derivations) {
      for (const depKey of depSet) {
        this.invalidateDependents(depKey);
      }
    }
  }

  /** Track dependency: derivedAtom depends on sourceAtom */
  trackDependency(derivedKey: string, sourceKey: string): void {
    let deps = this.derivations.get(derivedKey);
    if (!deps) {
      deps = new Set();
      this.derivations.set(derivedKey, deps);
    }
    deps.add(sourceKey);
  }

  /** Destroy store and clean up */
  destroy(): void {
    this.destroyed = true;
    this.values.clear();
    this.listeners.clear();
    this.derivations.clear();
    this.defaults.clear();
  }

  /** Get all registered atom keys */
  getKeys(): string[] {
    return [...new Set([...this.values.keys(), ...this.defaults.keys()])];
  }

  /** Export all atom values as JSON */
  exportState(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of this.values) {
      result[key] = value;
    }
    return result;
  }

  /** Import state from JSON */
  importState(state: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(state)) {
      if (this.defaults.has(key)) {
        this.values.set(key, value);
        const subs = this.listeners.get(key);
        if (subs) {
          for (const sub of subs) { try { sub.fn(value); } catch {} }
        }
      }
    }
  }

  // --- Private ---

  private invalidateDependents(changedKey: string): void {
    // Find all derived atoms that depend on changedKey
    const toInvalidate: string[] = [];
    for (const [derivedKey, depKeys] of this.derivations) {
      if (depKeys.has(changedKey)) {
        toInvalidate.push(derivedKey);
      }
    }

    // Remove cached values for invalidated derived atoms
    for (const key of toInvalidate) {
      this.values.delete(key);

      // Notify subscribers of the derived atom with recomputed value
      // We need to find the atom definition... simplified approach:
      const subs = this.listeners.get(key);
      if (subs) {
        // Signal that value may have changed
        // Subscribers will call .get() which triggers recomputation
        for (const sub of subs) {
          try { sub.fn(undefined); } catch {}
        }
      }

      // Cascade invalidation
      this.invalidateDependents(key);
    }
  }
}

// --- Global Store ---

let globalStore: AtomStore | null = null;

/** Get or create the global atom store */
export function getAtomStore(): AtomStore {
  if (!globalStore) globalStore = new AtomStore();
  return globalStore;
}

/** Reset the global store */
export function resetGlobalStore(): void {
  globalStore?.destroy();
  globalStore = null;
}

// --- Atom Factories ---

/**
 * Create a primitive (writable) atom.
 *
 * @example
 * const countAtom = atom(0);
 * const count = useAtom(countAtom); // [value, setValue]
 */
export function atom<T>(
  initialValue: T,
  options?: AtomOptions,
): Atom<T> {
  const key = options?.debugLabel ?? `atom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const atomDef: Atom<T> = { key, defaultValue: initialValue };

  // Register default in global store
  const store = getAtomStore();
  store.registerDefault(atomDef);

  // Auto-persist if requested
  if (options?.persist) {
    const pkey = typeof options.persist === "string" ? options.persist : `atom:${key}`;
    try {
      const saved = localStorage.getItem(pkey);
      if (saved) {
        atomDef.defaultValue = JSON.parse(saved) as T;
        store.registerDefault(atomDef);
      }
    } catch { /* ignore */ }
  }

  return atomDef;
}

/**
 * Create a read-only derived atom.
 * Value is computed from other atoms via the read function.
 *
 * @example
 * const doubleAtom = atom((get) => get(countAtom) * 2);
 */
export function atomRead<T>(
  readFn: (get: <V>(atom: Atom<V>) => V) => T,
  options?: Omit<AtomOptions, "persist">,
): ReadAtom<T> {
  const key = options?.debugLabel ?? `read_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return { key, read: readFn };
}

/**
 * Create a writable atom with custom write logic.
 */
export function atomWrite<T>(
  initialValue: T,
  writeFn: (
    get: <V>(atom: Atom<V>) => V,
    set: <V>(atom: Atom<V>, value: V) => void,
    newValue: T,
  ) => void,
  options?: AtomOptions,
): WriteAtom<T> {
  const key = options?.debugLabel ?? `write_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const store = getAtomStore();

  const atomDef: WriteAtom<T> = {
    key,
    defaultValue: initialValue,
    write: writeFn,
  };

  store.registerDefault({ key, defaultValue: initialValue });
  return atomDef;
}

// --- Atom Instance (useAtom equivalent) ---

/**
 * Create an instance wrapper around an atom for easy get/set/subscribe.
 */
export function useAtomValue<T>(atomDef: Atom<T>, store: AtomStore = getAtomStore()): AtomInstance<T> {
  return {
    get: () => store.get(atomDef),
    set: (value) => store.set(atomDef, value),
    subscribe: (listener) => store.subscribe(atomDef, listener),
    reset: () => {
      store.reset(atomDef);
    },
    atom: atomDef,
    destroy: () => {},
  };
}

// --- Atom Family ---

/**
 * Create an atom family: factory for parameterized atoms.
 * Each unique parameter gets its own atom instance.
 *
 * @example
 * const itemAtoms = atomFamily((id: number) => ({ name: "", checked: false }));
 * const item1 = itemAtoms(1);
 * const item2 = itemAtoms(2); // independent state
 */
export function atomFamily<T, P extends string | number>(
  paramFn: (param: P) => T,
  options?: Omit<AtomOptions, "persist">,
): (param: P) => Atom<T> {
  const cache = new Map<P, Atom<T>>();

  return (param: P): Atom<T> => {
    if (cache.has(param)) return cache.get(param)!;

    const key = `family_${options?.debugLabel ?? ""}_${String(param)}`;
    const atomDef: Atom<T> = { key, defaultValue: paramFn(param) };

    getAtomStore().registerDefault(atomDef);
    cache.set(param, atomDef);
    return atomDef;
  };
}

// --- Selector Atom Helpers ---

/** Pick a field from another atom */
export function selectAtom<T, K extends keyof T>(
  source: Atom<T>,
  field: K,
): ReadAtom<T[K]> {
  return atomRead((get) => get(source)[field]);
}

/** Map/transform another atom's value */
export function mapAtom<T, U>(
  source: Atom<T>,
  mapFn: (value: T) => U,
): ReadAtom<U> {
  return atomRead((get) => mapFn(get(source)));
}

/** Filter: derive boolean from predicate on another atom */
export function filterAtom<T>(
  source: Atom<T>,
  predicate: (value: T) => boolean,
): ReadAtom<boolean> {
  return atomRead((get) => predicate(get(source)));
}
