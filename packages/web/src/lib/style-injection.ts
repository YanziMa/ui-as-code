/**
 * Style Injection utility for dynamic CSS injection with deduplication,
 * scoping, ordering management, critical CSS extraction, and cleanup.
 */

// --- Types ---

export interface InjectedStyle {
  /** Unique ID for this style block */
  id: string;
  /** The injected <style> or <link> element */
  element: HTMLStyleElement | HTMLLinkElement;
  /** Original CSS content (for style elements) */
  css?: string;
  /** When it was injected */
  timestamp: number;
  /** Whether this is external (link tag) vs inline (style tag) */
  external: boolean;
}

export interface StyleInjectionOptions {
  /** Where to inject: "head" (default) or container element */
  target?: HTMLElement | "head";
  /** Position in target: "first" | "last" (default: "last") */
  position?: "first" | "last";
  /** Auto-prefix ID to avoid collisions (default: true) */
  autoPrefixId?: string;
  /** Wrap styles in a scope selector */
  scope?: string;
  /** Minify before injecting (default: false) */
  minify?: boolean;
  /** Called after successful injection */
  onInject?: (style: InjectedStyle) => void;
  /** Media query to wrap the style in */
  media?: string;
  /** Support layers (@layer) */
  layer?: string;
  /** Whether this style supports "nonce" CSP attribute */
  nonce?: string;
}

export interface StyleInjectionInstance {
  /** Inject a CSS string as a <style> element */
  injectCSS: (css: string, id?: string, options?: Partial<StyleInjectionOptions>) => InjectedStyle;
  /** Inject an external stylesheet via <link> */
  injectLink: (href: string, id?: string, options?: Partial<StyleInjectionOptions>) => Promise<InjectedStyle>;
  /** Remove an injected style by ID */
  remove: (id: string) => boolean;
  /** Get all currently injected styles */
  getAll: () => InjectedStyle[];
  /** Find an injected style by ID */
  find: (id: string) => InjectedStyle | null;
  /** Update an existing injected style's content */
  update: (id: string, newCss: string) => boolean;
  /** Enable/disable a style by toggling disabled attribute */
  toggle: (id: string, enabled?: boolean) => boolean;
  /** Clear all injected styles */
  clear: () => void;
  /** Destroy instance and remove all styles */
  destroy: () => void;
}

// --- Helpers ---

function minifyCSS(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")     // Remove comments
    .replace(/\s+/g, " ")                   // Collapse whitespace
    .replace(/;\s*}/g, "}")                // Remove trailing semicolons
    .replace(/\s*{\s*/g, "{")              // Clean around braces
    .replace(/}\s*/g, "}\n")
    .replace(/\s*([{};,:>~+])\s*/g, "$1")  // Clean around operators
    .trim();
}

function makeId(id?: string, prefix?: string): string {
  if (id) return `${prefix ?? ""}${id}`;
  return `inj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// --- Main ---

export function createStyleInjection(defaults: StyleInjectionOptions = {}): StyleInjectionInstance {
  let destroyed = false;
  const injected = new Map<string, InjectedStyle>();

  function getTarget(): HTMLElement {
    if (defaults.target && defaults.target !== "head") return defaults.target;
    return document.head;
  }

  function doInjectCSS(css: string, id?: string, opts: Partial<StyleInjectionOptions> = {}): InjectedStyle {
    if (destroyed) throw new Error("StyleInjection destroyed");

    const merged = { ...defaults, ...opts };
    const styleId = makeId(id, merged.autoPrefixId);

    // Dedup check
    if (injected.has(styleId)) {
      return injected.get(styleId)!;
    }

    let finalCss = css;
    if (merged.scope) {
      finalCss = `${merged.scope} {\n${css}\n}`;
    }
    if (merged.media) {
      finalCss = `@media ${merged.media} {\n${finalCss}\n}`;
    }
    if (merged.layer) {
      finalCss = `@layer ${merged.layer} {\n${finalCss}\n}`;
    }
    if (merged.minify) {
      finalCss = minifyCSS(finalCss);
    }

    const el = document.createElement("style");
    el.id = styleId;
    el.textContent = finalCss;
    if (merged.nonce) el.setAttribute("nonce", merged.nonce);

    const target = getTarget();
    if (merged.position === "first") {
      target.insertBefore(el, target.firstChild);
    } else {
      target.appendChild(el);
    }

    const result: InjectedStyle = {
      id: styleId,
      element: el,
      css,
      timestamp: Date.now(),
      external: false,
    };

    injected.set(styleId, result);
    merged.onInject?.(result);
    return result;
  }

  async function doInjectLink(href: string, id?: string, opts: Partial<StyleInjectionOptions> = {}): Promise<InjectedStyle> {
    if (destroyed) throw new Error("StyleInjection destroyed");

    const merged = { ...defaults, ...opts };
    const linkId = makeId(id, merged.autoPrefixId);

    if (injected.has(linkId)) {
      return injected.get(linkId)!;
    }

    const el = document.createElement("link");
    el.id = linkId;
    el.rel = "stylesheet";
    el.href = href;
    if (merged.media) el.media = merged.media;
    if (merged.nonce) el.setAttribute("nonce", merged.nonce);

    const target = getTarget();
    if (merged.position === "first") {
      target.insertBefore(el, target.firstChild);
    } else {
      target.appendChild(el);
    }

    const result: InjectedStyle = {
      id: linkId,
      element: el,
      timestamp: Date.now(),
      external: true,
    };

    injected.set(linkId, result);
    merged.onInject?.(result);
    return result;
  }

  function doRemove(id: string): boolean {
    const entry = injected.get(id);
    if (!entry) return false;
    entry.element.remove();
    injected.delete(id);
    return true;
  }

  function doUpdate(id: string, newCss: string): boolean {
    const entry = injected.get(id);
    if (!entry || entry.external) return false;
    (entry.element as HTMLStyleElement).textContent = newCss;
    entry.css = newCss;
    return true;
  }

  function doToggle(id: string, enabled?: boolean): boolean {
    const entry = injected.get(id);
    if (!entry) return false;
    const shouldBeEnabled = enabled ?? entry.element.disabled;
    entry.element.disabled = !shouldBeEnabled;
    return !entry.element.disabled;
  }

  const instance: StyleInjectionInstance = {
    injectCSS: doInjectCSS,
    injectLink: doInjectLink,
    remove: doRemove,
    getAll: () => Array.from(injected.values()),
    find: (id) => injected.get(id) ?? null,
    update: doUpdate,
    toggle: doToggle,
    clear() { for (const id of injected.keys()) doRemove(id); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      instance.clear();
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Quick one-shot: inject CSS into document head */
export function injectStyles(css: string, id?: string): HTMLStyleElement {
  const el = document.createElement("style");
  if (id) el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
  return el;
}

/** Quick one-shot: inject a stylesheet link */
export function injectStylesheet(href: string, id?: string): HTMLLinkElement {
  const el = document.createElement("link");
  if (id) el.id = id;
  el.rel = "stylesheet";
  el.href = href;
  document.head.appendChild(el);
  return el;
}

/** Remove an injected style by ID or element reference */
export function ejectStyles(idOrEl: string | HTMLElement): boolean {
  const el = typeof idOrEl === "string"
    ? document.getElementById(idOrEl)
    : idOrEl;
  if (el) { el.remove(); return true; }
  return false;
}
