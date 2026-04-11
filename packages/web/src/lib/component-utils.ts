/**
 * Component utilities: React-like component helpers for vanilla JS,
 * including lifecycle management, prop diffing, ref handling,
 * portal rendering, suspense-like patterns, and component registry.
 */

// --- Types ---

export interface ComponentProps {
  [key: string]: unknown;
}

export interface ComponentLifecycle<T = unknown> {
  /** Called once when component mounts */
  onMount?(): void;
  /** Called before unmount */
  onUnmount?(): void;
  /** Called before update with old props */
  willUpdate?(oldProps: T): void;
  /** Called after update */
  didUpdate?(oldProps: T): void;
}

export interface ComponentInstance<P extends ComponentProps = ComponentProps>
  extends ComponentLifecycle<P> {
  /** Unique ID for this instance */
  readonly id: string;
  /** Current props */
  props: P;
  /** The root DOM element of this component */
  el: HTMLElement | null;
  /** Whether the component is mounted */
  mounted: boolean;
  /** Update props (triggers re-render if implemented) */
  setProps(props: Partial<P>): void;
  /** Force a re-render */
  forceUpdate(): void;
  /** Destroy the component */
  destroy(): void;
}

// --- ID Generator ---

let componentIdCounter = 0;

function generateComponentId(): string {
  return `comp_${Date.now()}_${++componentIdCounter}`;
}

// --- Base Component Class ---

/**
 * Base class for creating UI components with lifecycle hooks.
 *
 * @example
 * class MyButton extends BaseComponent<{ label: string; onClick?: () => void }> {
 *   render() {
 *     const btn = document.createElement('button');
 *     btn.textContent = this.props.label;
 *     btn.addEventListener('click', () => this.props.onClick?.());
 *     return btn;
 *   }
 * }
 */
export abstract class BaseComponent<P extends ComponentProps = ComponentProps>
  implements ComponentInstance<P> {
  readonly id: string;
  props: P;
  el: HTMLElement | null = null;
  mounted = false;
  private _destroyed = false;

  constructor(initialProps: P) {
    this.id = generateComponentId();
    this.props = { ...initialProps };
  }

  /** Subclasses implement this to return the root DOM element */
  abstract render(): HTMLElement;

  /** Mount the component into a container element */
  mount(container: Element): this {
    if (this._destroyed || this.mounted) return this;

    this.onMount?.();
    this.el = this.render();
    container.appendChild(this.el);
    this.mounted = true;
    return this;
  }

  /** Update props and optionally re-render */
  setProps(newProps: Partial<P>): void {
    if (this._destroyed || !this.mounted) return;

    const oldProps = { ...this.props };
    this.willUpdate?.(oldProps as P);
    this.props = { ...this.props, ...newProps };

    // Re-render by default
    if (this.el && this.el.parentNode) {
      const newEl = this.render();
      this.el.parentNode.replaceChild(newEl, this.el);
      this.el = newEl;
    }

    this.didUpdate?.(oldProps as P);
  }

  forceUpdate(): void {
    if (!this.mounted || !this.el || !this.el.parentNode) return;
    const newEl = this.render();
    this.el.parentNode.replaceChild(newEl, this.el);
    this.el = newEl;
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.onUnmount?.();
    if (this.el?.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this.el = null;
    this.mounted = false;
  }

  get destroyed(): boolean {
    return this._destroyed;
  }
}

// --- Prop Diffing ---

/** Result of comparing two prop objects */
export interface PropDiffResult {
  changed: string[];
  added: string[];
  removed: string[];
  unchanged: string[];
}

/** Compare two prop objects to find what changed */
export function diffProps(
  oldProps: ComponentProps,
  newProps: ComponentProps,
  skipKeys: Set<string> = new Set(["children"]),
): PropDiffResult {
  const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);
  const result: PropDiffResult = { changed: [], added: [], removed: [], unchanged: [] };

  for (const key of allKeys) {
    if (skipKeys.has(key)) continue;

    const hadOld = key in oldProps;
    const hasNew = key in newProps;

    if (!hadOld && hasNew) {
      result.added.push(key);
    } else if (hadOld && !hasNew) {
      result.removed.push(key);
    } else if (oldProps[key] !== newProps[key]) {
      result.changed.push(key);
    } else {
      result.unchanged.push(key);
    }
  }

  return result;
}

/** Check if props have meaningfully changed (for should-component-update logic) */
export function propsChanged(
  oldProps: ComponentProps,
  newProps: ComponentProps,
  watchedKeys?: string[],
): boolean {
  if (watchedKeys) {
    return watchedKeys.some((k) => oldProps[k] !== newProps[k]);
  }
  const diff = diffProps(oldProps, newProps);
  return diff.changed.length > 0 || diff.added.length > 0 || diff.removed.length > 0;
}

// --- Ref Management ---

/** Create a ref object that can hold a reference to any value */
export function createRef<T = Element>(): { current: T | null } {
  return { current: null };
}

/** Callback ref — calls the callback when the ref is attached/detached */
export function createCallbackRef<T>(
  onAttach: (el: T) => void,
  onDetach?: (el: T) => void,
): (el: T | null) => void {
  let previous: T | null = null;
  return (el: T | null) => {
    if (previous && onDetach) {
      onDetach(previous);
    }
    previous = el;
    if (el) {
      onAttach(el);
    }
  };
}

/** Forward ref support — merge multiple refs into one */
export function mergeRefs<T>(...refs: Array<((el: T | null) => void) | { current: T | null } | null | undefined>): (el: T | null) => void {
  return (el: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") {
        ref(el);
      } else if ("current" in ref) {
        ref.current = el;
      }
    }
  };
}

// --- Portal ---

/**
 * Render a component's DOM into a different part of the document (portal).
 * Useful for modals, tooltips, dropdowns that need to escape overflow/stacking context.
 */
export class Portal {
  private container: HTMLElement;
  private content: HTMLElement | null = null;

  constructor(target?: HTMLElement) {
    this.container = target ?? document.body;
  }

  /** Render content into the portal target */
  open(content: HTMLElement): void {
    this.close();
    this.content = content;
    this.container.appendChild(content);
  }

  /** Remove content from portal */
  close(): void {
    if (this.content && this.content.parentNode === this.container) {
      this.container.removeChild(this.content);
    }
    this.content = null;
  }

  /** Check if portal has content */
  get isOpen(): boolean {
    return this.content !== null && this.content.parentNode === this.container;
  }

  /** Get or create the portal container element */
  getContainer(): HTMLElement {
    return this.container;
  }

  /** Destroy the portal entirely */
  destroy(): void {
    this.close();
  }
}

/** Create a portal to document body (common case) */
export function createPortal(content: HTMLElement): Portal {
  const portal = new Portal();
  portal.open(content);
  return portal;
}

// --- Suspense-like Pattern ---

/**
 * Show a fallback while an async operation is in progress.
 * Simple Suspense-like pattern for vanilla components.
 */
export class SuspenseBoundary {
  private container: HTMLElement;
  private fallbackEl: HTMLElement | null = null;
  private contentEl: HTMLElement | null = null;
  private loading = false;

  constructor(container: HTMLElement, fallback?: HTMLElement) {
    this.container = container;
    if (fallback) {
      this.fallbackEl = fallback;
      this.fallbackEl.style.display = "none";
      this.container.appendChild(this.fallbackEl);
    }
  }

  /** Start loading state — show fallback */
  startLoading(): void {
    this.loading = true;
    if (this.contentEl) this.contentEl.style.display = "none";
    if (this.fallbackEl) this.fallbackEl.style.display = "";
  }

  /** End loading state — show content */
  settle(content: HTMLElement): void {
    this.loading = false;
    if (this.fallbackEl) this.fallbackEl.style.display = "none";

    if (this.contentEl) {
      this.contentEl.replaceWith(content);
    } else {
      this.container.appendChild(content);
    }
    this.contentEl = content;
    this.contentEl.style.display = "";
  }

  /** Check if currently in loading state */
  get isLoading(): boolean {
    return this.loading;
  }

  /** Destroy and cleanup */
  destroy(): void {
    this.fallbackEl?.remove();
    this.contentEl?.remove();
    this.fallbackEl = null;
    this.contentEl = null;
  }
}

// --- Component Registry ---

/**
 * Global registry for components, enabling dynamic lookup and instantiation.
 */
export class ComponentRegistry<T extends ComponentInstance = ComponentInstance> {
  private components = new Map<string, T>();
  private factories = new Map<string, (props: ComponentProps) => T>();

  /** Register a component factory under a name */
  register(name: string, factory: (props: ComponentProps) => T): void {
    this.factories.set(name, factory);
  }

  /** Unregister a component factory */
  unregister(name: string): boolean {
    return this.factories.delete(name);
  }

  /** Create and track a component instance by name */
  create(name: string, props: ComponentProps = {}): T | undefined {
    const factory = this.factories.get(name);
    if (!factory) return undefined;
    const instance = factory(props);
    this.components.set(instance.id, instance);
    return instance;
  }

  /** Get a tracked component instance by ID */
  get(id: string): T | undefined {
    return this.components.get(id);
  }

  /** Find instances by name pattern */
  findByName(namePattern: string | RegExp): T[] {
    const results: T[] = [];
    for (const [, comp] of this.components) {
      const match = typeof namePattern === "string"
        ? (comp as unknown as Record<string, unknown>).name === namePattern
        : namePattern.test(String((comp as unknown as Record<string, unknown>).name ?? ""));
      if (match) results.push(comp);
    }
    return results;
  }

  /** Remove a component from tracking (doesn't destroy it) */
  remove(id: string): boolean {
    return this.components.delete(id);
  }

  /** List all registered factory names */
  listFactories(): string[] {
    return [...this.factories.keys()];
  }

  /** List all active component IDs */
  listInstances(): string[] {
    return [...this.components.keys()];
  }

  /** Destroy all tracked instances */
  destroyAll(): void {
    for (const [, comp] of this.components) {
      comp.destroy();
    }
    this.components.clear();
  }
}

// --- Fragment Helper ---

/**
 * Create a DocumentFragment from children.
 * Unlike elements, fragments don't add extra wrapper DOM nodes.
 */
export function createFragment(...children: (Element | Text | string)[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const child of children) {
    frag.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return frag;
}

// --- Slot System ---

/**
 * Simple slot system for component composition.
 * Named slots allow flexible content projection.
 */
export class SlotManager {
  private slots = new Map<string, Element>();
  private defaultSlot: Element | null = null;

  /** Set content for a named slot */
  setSlot(name: string, content: Element): void {
    const existing = this.slots.get(name);
    if (existing) existing.replaceWith(content);
    else this.slots.set(name, content);
  }

  /** Set default (unnamed) slot content */
  setDefault(content: Element): void {
    if (this.defaultSlot) this.defaultSlot.replaceWith(content);
    this.defaultSlot = content;
  }

  /** Get slot content by name */
  getSlot(name: string): Element | undefined {
    return this.slots.get(name);
  }

  /** Get default slot content */
  getDefault(): Element | null {
    return this.defaultSlot;
  }

  /** Render all slots into a container with designated slot containers */
  renderInto(container: HTMLElement, slotElements?: Record<string, HTMLElement>): void {
    // Render named slots
    for (const [name, content] of this.slots) {
      const target = slotElements?.[name] ?? container.querySelector(`[data-slot="${name}"]`) as HTMLElement | undefined;
      if (target) {
        target.innerHTML = "";
        target.appendChild(content);
      }
    }

    // Render default slot
    if (this.defaultSlot) {
      const defaultTarget = container.querySelector("[data-slot='default']") as HTMLElement | undefined;
      if (defaultTarget) {
        defaultTarget.innerHTML = "";
        defaultTarget.appendChild(this.defaultSlot);
      }
    }
  }

  /** Clear all slots */
  clear(): void {
    this.slots.clear();
    this.defaultSlot = null;
  }
}
