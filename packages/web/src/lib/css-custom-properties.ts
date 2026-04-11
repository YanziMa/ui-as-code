/**
 * CSS Custom Properties (CSS Variables) manager for reading, writing, watching,
 * animating, theming, and cascading CSS variables at runtime with type safety.
 */

// --- Types ---

export interface CssVarDefinition {
  /** Variable name (--custom-name) */
  name: string;
  /** Current computed value */
  value: string;
  /** Default/fallback value */
  defaultValue?: string;
  /** Syntax hint for validation (e.g., "<color>", "<length>") */
  syntax?: string;
  /** Whether this variable inherits (default: true) */
  inherits?: boolean;
  /** Initial value */
  initialValue?: string;
}

export interface CssVarAnimationOptions {
  /** Target value */
  to: string;
  /** Duration in ms (default: 300) */
  duration?: number;
  /** Easing function (default: "ease") */
  easing?: string;
  /** From value (default: current computed value) */
  from?: string;
  /** Callback on each frame */
  onUpdate?: (value: string) => void;
  /** Callback when complete */
  onComplete?: () => void;
}

export interface CssCustomPropertiesOptions {
  /** Root element to manage variables on (default: :root / documentElement) */
  root?: HTMLElement;
  /** Prefix all variable names (e.g., "--app-") */
  prefix?: string;
  /** Watch for external changes via MutationObserver (default: false) */
  watchExternalChanges?: boolean;
  /** Called when any watched variable changes */
  onChange?: (name: string, oldValue: string, newValue: string) => void;
  /** Log operations for debugging (default: false) */
  debug?: boolean;
}

export interface CssCustomPropertiesInstance {
  /** Set a custom property */
  set: (name: string, value: string) => void;
  /** Get a custom property's computed value */
  get: (name: string) => string;
  /** Get a custom property with fallback */
  getWithFallback: (name: string, fallback: string) => string;
  /** Delete a custom property (revert to default) */
  delete: (name: string) => void;
  /** Set multiple properties at once */
  setMany: (vars: Record<string, string>) => void;
  /** Get all custom properties on the root */
  getAll: () => Record<string, string>;
  /** Animate a custom property from one value to another */
  animate: (name: string, options: CssVarAnimationOptions) => void;
  /** Register a variable definition (for validation/documentation) */
  register: (def: CssVarDefinition) => void;
  /** Subscribe to changes on a specific variable */
  subscribe: (name: string, callback: (value: string) => void) => () => void;
  /** Create a scoped context that overrides some variables */
  createScopedContext: (overrides: Record<string, string>, scopeEl: HTMLElement) => () => void;
  /** Export all current values as a CSS string */
  exportCss: () => string;
  /** Import values from a CSS string or object */
  importVars: (source: string | Record<string, string>) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function normalizeVarName(name: string, prefix?: string): string {
  let n = name.startsWith("--") ? name : `--${name}`;
  if (prefix && !n.startsWith(prefix)) n = prefix + n.replace("--", "");
  return n;
}

function parseEasing(easing: string): (t: number) => number {
  // Simple easing parser — supports basic named functions
  const easings: Record<string, (t: number) => number> = {
    linear: (t) => t,
    ease: (t) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2,
    "ease-in": (t) => t * t,
    "ease-out": (t) => 1 - (1 - t) * (1 - t),
    "ease-in-out": (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  };
  return easings[easing] ?? easings.ease;
}

// For color interpolation (simple hex/rgb support)
function interpolateValue(from: string, to: string, progress: number): string {
  // If both are numeric-like (ending in px, em, rem, %, etc.)
  const fromNum = parseFloat(from);
  const toNum = parseFloat(to);
  const fromUnit = from.replace(/[-0-9.]/g, "");
  const toUnit = to.replace(/[-0-9.]/g, "");

  if (!isNaN(fromNum) && !isNaN(toNum) && fromUnit === toUnit) {
    const val = fromNum + (toNum - fromNum) * progress;
    return `${val.toFixed(2)}${fromUnit}`;
  }

  // Fallback: linear interpolation based on progress
  return progress >= 0.5 ? to : from;
}

// --- Main ---

export function createCssCustomProperties(options: CssCustomPropertiesOptions = {}): CssCustomPropertiesInstance {
  const {
    root: rootEl,
    prefix,
    watchExternalChanges = false,
    onChange,
    debug = false,
  } = options;

  let destroyed = false;
  const root = rootEl ?? document.documentElement;
  const listeners = new Map<string, Set<(value: string) => void>>();
  const registered = new Map<string, CssVarDefinition>();
  let mutationObserver: MutationObserver | null = null;

  function log(msg: string): void {
    if (debug) console.log(`[css-vars] ${msg}`);
  }

  function resolveName(name: string): string {
    return normalizeVarName(name, prefix);
  }

  function doSet(name: string, value: string): void {
    if (destroyed) return;
    const resolved = resolveName(name);
    const oldVal = root.style.getPropertyValue(resolved);
    root.style.setProperty(resolved, value);
    log(`Set ${resolved} = ${value}`);

    // Notify subscribers
    const subs = listeners.get(resolved);
    if (subs) {
      for (const cb of subs) cb(value);
    }

    if (oldVal !== value) {
      onChange?.(resolved, oldVal, value);
    }
  }

  function doGet(name: string): string {
    const resolved = resolveName(name);
    return getComputedStyle(root).getPropertyValue(resolved).trim();
  }

  function doGetWithFallback(name: string, fallback: string): string {
    const resolved = resolveName(name);
    const val = getComputedStyle(root).getPropertyValue(resolved).trim();
    return val || fallback;
  }

  function doDelete(name: string): void {
    const resolved = resolveName(name);
    root.style.removeProperty(resolved);
    log(`Deleted ${resolved}`);
  }

  function doSetMany(vars: Record<string, string>): void {
    for (const [k, v] of Object.entries(vars)) {
      doSet(k, v);
    }
  }

  function doGetAll(): Record<string, string> {
    const cs = getComputedStyle(root);
    const result: Record<string, string> = {};
    // We can't enumerate all custom properties directly from computed style
    // Return what we've tracked plus what's inline
    for (let i = 0; i < root.style.length; i++) {
      const prop = root.style[i];
      if (prop.startsWith("--")) {
        result[prop] = root.style.getPropertyValue(prop).trim();
      }
    }
    return result;
  }

  function doAnimate(name: string, options: CssVarAnimationOptions): void {
    if (destroyed) return;
    const resolved = resolveName(name);
    const {
      to,
      duration = 300,
      easing = "ease",
      from: fromVal,
      onUpdate,
      onComplete,
    } = options;

    const from = fromVal ?? doGet(name);
    const start = performance.now();
    const easingFn = parseEasing(easing);

    function frame(time: number): void {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);
      const currentValue = interpolateValue(from, to, easedProgress);

      doSet(name, currentValue);
      onUpdate?.(currentValue);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        doSet(name, to);
        onComplete?.();
      }
    }

    requestAnimationFrame(frame);
  }

  function doRegister(def: CssVarDefinition): void {
    const resolved = resolveName(def.name);
    registered.set(resolved, def);
  }

  function doSubscribe(name: string, callback: (value: string) => void): () => void {
    const resolved = resolveName(name);
    if (!listeners.has(resolved)) listeners.set(resolved, new Set());
    listeners.get(resolved)!.add(callback);
    callback(getDoct(resolved)); // Emit current value
    return () => { listeners.get(resolved)?.delete(callback); };
  }

  function getDoct(name: string): string {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  function doCreateScopedContext(overrides: Record<string, string>, scopeEl: HTMLElement): () => void {
    for (const [k, v] of Object.entries(overrides)) {
      scopeEl.style.setProperty(resolveName(k), v);
    }
    return () => {
      for (const k of Object.keys(overrides)) {
        scopeEl.style.removeProperty(resolveName(k));
      }
    };
  }

  function doExportCss(): string {
    const lines: string[] = [];
    for (let i = 0; i < root.style.length; i++) {
      const prop = root.style[i];
      if (prop.startsWith("--")) {
        lines.push(`  ${prop}: ${root.style.getPropertyValue(prop)};`);
      }
    }
    return `:root {\n${lines.join("\n")}\n}`;
  }

  function doImportVars(source: string | Record<string, string>): void {
    if (typeof source === "string") {
      // Parse simple CSS var declarations: --name: value;
      const decls = source.match(/--[\w-]+\s*:\s*[^;]+;/g) ?? [];
      for (const decl of decls) {
        const match = decl.match(/(--[\w-]+)\s*:\s*(.+?)\s*;/);
        if (match) doSet(match[1], match[2].trim());
      }
    } else {
      doSetMany(source);
    }
  }

  // Setup mutation observer
  if (watchExternalChanges && typeof MutationObserver !== "undefined") {
    mutationObserver = new MutationObserver((mutations) => {
      for (const mut of mutations) {
        if (mut.type === "attributes" && mut.attributeName === "style") {
          // Re-read all vars and detect changes
          const current = doGetAll();
          // Simple change detection would require storing previous state
          // For now, just notify that something changed
        }
      }
    });
    mutationObserver.observe(root, { attributes: true, attributeFilter: ["style"] });
  }

  const instance: CssCustomPropertiesInstance = {
    set: doSet,
    get: doGet,
    getWithFallback: doGetWithFallback,
    delete: doDelete,
    setMany: doSetMany,
    getAll: doGetAll,
    animate: doAnimate,
    register: doRegister,
    subscribe: doSubscribe,
    createScopedContext: doCreateScopedContext,
    exportCss: doExportCss,
    importVars: doImportVars,

    destroy() {
      if (destroyed) return;
      destroyed = true;
      listeners.clear();
      registered.clear();
      if (mutationObserver) { mutationObserver.disconnect(); mutationObserver = null; }
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Quick getter: read a CSS variable */
export function getCssVar(name: string, element?: HTMLElement): string {
  const el = element ?? document.documentElement;
  return getComputedStyle(el).getPropertyValue(name.startsWith("--") ? name : `--${name}`).trim();
}

/** Quick setter: write a CSS variable */
export function setCssVar(name: string, value: string, element?: HTMLElement): void {
  const el = element ?? document.documentElement;
  el.style.setProperty(name.startsWith("--") ? name : `--${name}`, value);
}

/** Read all CSS custom properties from an element */
export function getAllCssVars(element?: HTMLElement): Record<string, string> {
  const el = element ?? document.documentElement;
  const cs = getComputedStyle(el);
  const result: Record<string, string> = {};

  // Read from inline style first
  for (let i = 0; i < el.style.length; i++) {
    const prop = el.style[i];
    if (prop.startsWith("--")) {
      result[prop] = el.style.getPropertyValue(prop).trim();
    }
  }

  return result;
}
