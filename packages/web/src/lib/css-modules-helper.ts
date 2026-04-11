/**
 * CSS Modules helper for scoped class name generation, composition, mapping,
 * and runtime style resolution with deterministic hashing.
 */

// --- Types ---

export interface CssModuleClassMap {
  [originalName: string]: string;
}

export interface CssModulesOptions {
  /** Prefix for generated class names (default: "_css_") */
  prefix?: string;
  /** Hash algorithm: "djb2" | "fnv1a" | "simple" (default: "djb2") */
  hashAlgorithm?: "djb2" | "fnv1a" | "simple";
  /** Scope to a specific element's subtree (isolation) */
  scopeTo?: HTMLElement;
  /** Generate camelCase property names from kebab-case CSS classes */
  camelCase?: boolean;
}

export interface CssModulesInstance {
  /** Generate a scoped class name from an original name */
  generate: (name: string) => string;
  /** Generate multiple scoped names at once */
  generateMany: (names: string[]) => CssModuleClassMap;
  /** Compose multiple class names into one */
  compose: (...names: string[]) => string;
  /** Apply scoped classes to an element */
  apply: (element: HTMLElement, classMap: Record<string, boolean>) => void;
  /** Check if an element has a specific scoped class */
  has: (element: HTMLElement, originalName: string) => boolean;
  /** Get the current module's class map */
  getClassMap: () => CssModuleClassMap;
  /** Create a sub-scope with its own namespace */
  createSubScope: (namespace: string) => CssModulesInstance;
  /** Destroy */
  destroy: () => void;
}

// --- Hash functions ---

function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash).toString(36);
}

function fnv1aHash(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) & 0xffffffff;
  }
  return Math.abs(hash).toString(36);
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash).toString(36);
}

const HASHERS: Record<string, (s: string) => string> = {
  djb2: djb2Hash,
  fnv1a: fnv1aHash,
  simple: simpleHash,
};

// --- Helpers ---

function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
}

// --- Main ---

export function createCssModules(options: CssModulesOptions = {}): CssModulesInstance {
  const {
    prefix = "_css_",
    hashAlgorithm = "djb2",
    camelCase: useCamelCase = false,
  } = options;

  let destroyed = false;
  const cache = new Map<string, string>();
  const hasher = HASHERS[hashAlgorithm] ?? djb2Hash;
  const generatedNames = new Set<string>();

  function doGenerate(name: string): string {
    if (cache.has(name)) return cache.get(name)!;

    const hashed = hasher(name);
    const scopedName = `${prefix}${name}_${hashed}`;
    cache.set(name, scopedName);
    generatedNames.add(scopedName);
    return scopedName;
  }

  function doGenerateMany(names: string[]): CssModuleClassMap {
    const map: CssModuleClassMap = {};
    for (const name of names) {
      map[name] = doGenerate(name);
      // Also add camelCase variant
      if (useCamelCase) {
        map[toCamelCase(name)] = doGenerate(name);
      }
    }
    return map;
  }

  function doCompose(...names: string[]): string {
    return names.map((n) => doGenerate(n)).filter(Boolean).join(" ");
  }

  function doApply(element: HTMLElement, classMap: Record<string, boolean>): void {
    if (destroyed) return;
    const toAdd: string[] = [];
    const toRemove: string[] = [];

    for (const [original, shouldHave] of Object.entries(classMap)) {
      const scoped = doGenerate(original);
      if (shouldHave) {
        toAdd.push(scoped);
      } else {
        toRemove.push(scoped);
      }
    }

    // Remove
    if (toRemove.length > 0) {
      element.classList.remove(...toRemove);
    }
    // Add
    if (toAdd.length > 0) {
      element.classList.add(...toAdd);
    }
  }

  function doHas(element: HTMLElement, originalName: string): boolean {
    return element.classList.contains(doGenerate(originalName));
  }

  function doGetClassMap(): CssModuleClassMap {
    const map: CssModuleClassMap = {};
    for (const [key, value] of cache) {
      map[key] = value;
      if (useCamelCase) {
        map[toCamelCase(key)] = value;
      }
    }
    return map;
  }

  function doCreateSubScope(namespace: string): CssModulesInstance {
    return createCssModules({
      ...options,
      prefix: `${prefix}${namespace}__`,
    });
  }

  const instance: CssModulesInstance = {
    generate: doGenerate,
    generateMany: doGenerateMany,
    compose: doCompose,
    apply: doApply,
    has: doHas,
    getClassMap: doGetClassMap,
    createSubScope: doCreateSubScope,

    destroy() {
      if (destroyed) return;
      destroyed = true;
      cache.clear();
      generatedNames.clear();
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Quick one-shot: generate a single scoped class name */
export function scopeClassName(name: string, prefix = "_css_"): string {
  return createCssModules({ prefix }).generate(name);
}

/** Extract the original unscoped name from a scoped class name */
export function unscopeClassName(scopedName: string, prefix = "_css_"): string | null {
  if (!scopedName.startsWith(prefix)) return null;
  const rest = scopedName.slice(prefix.length);
  const lastUnderscore = rest.lastIndexOf("_");
  if (lastUnderscore <= 0) return null;
  return rest.slice(0, lastUnderscore);
}
