/**
 * @module virtual-dom
 * @description A lightweight Virtual DOM implementation for educational/demonstration purposes.
 *
 * This module provides a complete mini-framework including:
 * - VNode system with element, text, and component nodes
 * - DOM creation from virtual nodes with event delegation
 * - Efficient tree diffing with keyed list support
 * - Patch operations for minimal DOM mutations
 * - Reconciliation with component lifecycle hooks
 * - Synthetic event system with pooling and delegation
 * - Priority-based scheduler with work interruption (Fiber-like)
 * - Memoization utilities with custom comparison functions
 * - Context API with Provider/Consumer pattern
 * - Error boundaries for graceful error handling
 * - React DevTools-compatible integration hook
 *
 * Pure TypeScript -- no external dependencies.
 */

// ---------------------------------------------------------------------------
// 1. Type Definitions & Interfaces
// ---------------------------------------------------------------------------

/** Virtual node types supported by this VDOM */
export type VNodeType = 'element' | 'text' | 'component' | 'fragment';

/** Priority levels for the scheduler */
export const enum Priority {
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

/** Patch operation types emitted by the diffing algorithm */
export const enum PatchType {
  CREATE_ELEMENT = 'CREATE_ELEMENT',
  REMOVE_ELEMENT = 'REMOVE_ELEMENT',
  REPLACE_ELEMENT = 'REPLACE_ELEMENT',
  UPDATE_PROPS = 'UPDATE_PROPS',
  REORDER_CHILDREN = 'REORDER_CHILDREN',
  SET_TEXT = 'SET_TEXT',
}

/** Standard HTML/SVG attribute names that should be set via property rather than setAttribute */
const PROPERTY_ATTRIBUTES: ReadonlySet<string> = new Set([
  'value', 'checked', 'disabled', 'readOnly', 'selected', 'multiple',
  'className', 'htmlFor', 'tabIndex', 'contentEditable', 'spellCheck',
  'draggable', 'hidden', 'autofocus', 'required', 'placeholder',
  'type', 'name', 'id', 'style', 'title', 'accessKey', 'lang', 'dir',
]);

/** Event handler name pattern: on + CapitalLetter */
const EVENT_HANDLER_RE = /^on[A-Z]/;

/**
 * Props map for a VNode. Keys are attribute/event names, values can be any type.
 * Event handlers are identified by the `on` prefix convention (e.g. `onClick`).
 */
export interface VNodeProps extends Record<string, unknown> {
  key?: string | number;
  ref?: (el: Element | Text | null) => void;
  [key: string]: unknown;
}

/**
 * Virtual Node -- the core data structure of this VDOM library.
 *
 * Represents an element, text node, component instance, or fragment in the
 * virtual tree. Each VNode is immutable once created; updates produce new
 * VNodes which are then diffed against the old tree.
 */
export interface VNode<T = unknown> {
  /** Discriminant for node kind */
  type: VNodeType;
  /** Tag name ('div'), text content ('hello'), or component function */
  tag: string | ComponentFunction<T>;
  /** Attributes / event handlers / special props */
  props: VNodeProps;
  /** Child VNodes (only meaningful for elements and fragments) */
  children: VNode[];
  /** Reference to the real DOM node after mounting (populated at runtime) */
  dom: Element | Text | null;
  /** The parent VNode in the tree (set during reconciliation) */
  parent: VNode | null;
  /** Fiber-like link to the next unit of work */
  next: VNodeWork | null;
  /** Component instance state (only for component-type nodes) */
  componentInstance?: ComponentInstance<T>;
  /** Old props snapshot (used during update to compute prop diffs) */
  oldProps?: VNodeProps;
}

/** A unit of work processed by the fiber-like reconciler */
export interface VNodeWork {
  vnode: VNode;
  pendingProps: VNodeProps | null;
  effectTag: PatchType | null;
  nextEffect: VNodeWork | null;
}

/** Function signature for stateful / functional components */
export type ComponentFunction<P = unknown> = (props: P) => VNode;

/** Lifecycle hooks available on a component instance */
export interface ComponentLifecycle {
  willMount?(): void;
  didMount?(): void;
  willUpdate?(prevProps: unknown): void;
  didUpdate?(prevProps: unknown): void;
  willUnmount?(): void;
  didCatch?(error: Error, info: ErrorInfo): void;
}

/** Error information passed to error boundary callbacks */
export interface ErrorInfo {
  componentStack: string;
}

/** Internal representation of a mounted component */
export interface ComponentInstance<P = unknown> extends ComponentLifecycle {
  props: P;
  state: Record<string, unknown>;
  isMounted: boolean;
  setState(partial: Record<string, unknown>, callback?: () => void): void;
  forceUpdate(callback?: () => void): void;
  _vnode: VNode | null;
  _currentElement: VNode | null;
}

/** Describes a single patch to apply to the real DOM */
export interface Patch {
  type: PatchType;
  vnode?: VNode;
  dom?: Element | Text;
  newDom?: Element | Text;
  propsDiff?: PropsDiff;
  newText?: string;
  childrenOrder?: (Element | Text)[];
  parentDom?: Element;
  index?: number;
}

/** Result of comparing two props objects */
export interface PropsDiff {
  added: VNodeProps;
  removed: Set<string>;
  changed: VNodeProps;
}

/** Synthetic event wrapper around native browser events */
export interface SyntheticEvent<E = Event> extends Event {
  nativeEvent: E;
  currentTarget: EventTarget | null;
  defaultPrevented: boolean;
  isPropagationStopped: boolean;
  isDefaultPrevented(): boolean;
  stopPropagation(): void;
  preventDefault(): void;
  persist(): void;
  isPersistent(): boolean;
}

/** A pooled synthetic event object ready for reuse */
interface PooledEvent<E = Event> extends SyntheticEvent<E> {
  __pooled: boolean;
  __disposed: boolean;
}

/** Scheduler work item */
interface ScheduledWork {
  id: number;
  priority: Priority;
  callback: () => void;
  deadline: number;
  cancelled: boolean;
}

/** Context definition created by `createContext` */
export interface Context<T = unknown> {
  readonly id: symbol;
  readonly defaultValue: T;
  Provider: ComponentFunction<{ value: T; children: VNode[] }>;
  Consumer: ComponentFunction<{ children: (value: T) => VNode }>;
  _subscribers: Set<(value: T) => void>;
  _currentValue: T;
}

/** Memo comparison function signature */
export type MemoCompareFunction<P = unknown> = (prevProps: P, nextProps: P) => boolean;

/** Memoized component wrapper result */
export interface MemoizedComponent<P = unknown> {
  (props: P): VNode;
  compare?: MemoCompareFunction<P>;
  displayName?: string;
}

/** DevTools hook compatible with __REACT_DEVTOOLS_GLOBAL_HOOK__ */
export interface DevToolsHook {
  renderers: Map<number, {
    findDOMNode(instance: unknown): Element | Text | null;
    getPublicInstance(instance: unknown): unknown;
    onCommitFiberRoot?(id: number, root: unknown, ...args: unknown[]): void;
    onScheduleWork?(root: unknown, ...args: unknown[]): void;
  }>;
  emit(event: string, ...args: unknown[]): void;
  inject(backend: unknown): void;
  supportsFiber: boolean;
  _renderers: Map<number, unknown>;
  _listeners: Map<string, ((...args: unknown[]) => void)[]>;
}

/** Configuration options for the VDOM renderer */
export interface RendererConfig {
  container: Element;
  eventDelegationRoot?: Element;
  enableDevTools?: boolean;
  devToolsHook?: DevToolsHook;
}

// ---------------------------------------------------------------------------
// 2. VNode Factory Functions
// ---------------------------------------------------------------------------

let globalVNodeId = 0;

/**
 * Create a virtual element node.
 *
 * @example
 * ```ts
 * const el = h('div', { className: 'box', onClick: handleClick }, [
 *   h('span', {}, ['Hello']),
 * ]);
 * ```
 */
export function h(
  tag: string,
  props: VNodeProps = {},
  children: (VNode | string)[] = [],
): VNode {
  const normalizedChildren: VNode[] = children.map((child) =>
    typeof child === 'string' ? createTextVNode(child) : child,
  );
  return createBaseVNode('element', tag, props, normalizedChildren);
}

/**
 * Create a virtual text node.
 *
 * @example
 * ```ts
 * const txt = createTextVNode('Hello world');
 * ```
 */
export function createTextVNode(text: string): VNode {
  return createBaseVNode('text', '#text', {nodeValue: text}, []);
}

/**
 * Create a virtual fragment node (wrapper without a real DOM element).
 *
 * Fragments allow returning multiple children without a wrapping `<div>`.
 */
export function Fragment(props: { children?: (VNode | string)[] }): VNode {
  const rawChildren = props.children ?? [];
  const normalizedChildren: VNode[] = rawChildren.map((child) =>
    typeof child === 'string' ? createTextVNode(child) : child,
  );
  return createBaseVNode('fragment', 'Fragment', {}, normalizedChildren);
}

/**
 * Create a virtual component node.
 *
 * @example
 * ```ts
 * const MyComp = (props: { name: string }) => h('div', {}, [`Hi ${props.name}`]);
 * const vnode = createComponentVNode(MyComp, { name: 'Alice' });
 * ```
 */
export function createComponentVNode<P>(
  component: ComponentFunction<P>,
  props: P,
  key?: string | number,
): VNode {
  const vprops: VNodeProps = {...(props as unknown as VNodeProps)};
  if (key !== undefined) vprops.key = key;
  return createBaseVNode('component', component, vprops, []);
}

/** Internal base constructor shared by all VNode factory functions */
function createBaseVNode(
  type: VNodeType,
  tag: string | ComponentFunction,
  props: VNodeProps,
  children: VNode[],
): VNode {
  return {
    type,
    tag,
    props: {...props},
    children,
    dom: null,
    parent: null,
    next: null,
  };
}

// ---------------------------------------------------------------------------
// 3. DOM Creation
// ---------------------------------------------------------------------------

/** Maps event names like `onClick` -> `click` */
function normalizeEventName(propName: string): string | null {
  if (!EVENT_HANDLER_RE.test(propName)) return null;
  return propName.slice(2).toLowerCase();
}

/**
 * Create a real DOM element (or document fragment) from a VNode.
 *
 * Handles:
 * - Regular HTML/SVG elements
 * - Text nodes
 * - Fragments (returns DocumentFragment)
 * - Property vs attribute assignment
 * - Event handler registration (via delegation when root is configured)
 * - Style object normalization
 * - Class name handling (merges `class` and `className`)
 */
export function createElement(vnode: VNode, delegationRoot?: Element | null): Element | Text | DocumentFragment {
  switch (vnode.type) {
    case 'element': {
      const el = document.createElement(vnode.tag as string);
      applyProps(el, vnode.props, null, delegationRoot ?? null);
      vnode.children.forEach((child) => {
        el.appendChild(createElement(child, delegationRoot));
      });
      vnode.dom = el as Element;
      return el;
    }
    case 'text': {
      const textNode = document.createTextNode((vnode.props.nodeValue as string) ?? '');
      vnode.dom = textNode;
      return textNode;
    }
    case 'fragment': {
      const frag = document.createDocumentFragment();
      vnode.children.forEach((child) => {
        frag.appendChild(createElement(child, delegationRoot));
      });
      // Store reference to first child for fragment tracking
      if (frag.firstChild) {
        vnode.dom = frag.firstChild as Element;
      }
      return frag;
    }
    case 'component':
      // Components are rendered into their output VNode's DOM
      if (vnode.componentInstance && vnode.componentInstance._currentElement) {
        return createElement(vnode.componentInstance._currentElement, delegationRoot);
      }
      return document.createDocumentFragment();
    default:
      throw new Error(`Unknown VNodeType: ${(vnode as VNode).type}`);
  }
}

/**
 * Apply (or diff) props onto a real DOM element.
 *
 * @param el       - Target DOM element
 * @param newProps - New props to apply
 * @param oldProps - Previous props (for computing diffs; null means initial mount)
 * @param delegRoot- Root element for event delegation (null = direct binding)
 */
export function applyProps(
  el: Element,
  newProps: VNodeProps,
  oldProps: VNodeProps | null,
  delegRoot: Element | null,
): void {
  const allKeys = new Set<string>([
    ...(oldProps ? Object.keys(oldProps) : []),
    ...Object.keys(newProps),
  ]);

  for (const key of allKeys) {
    // Skip internal keys
    if (key === 'key' || key === 'ref' || key === 'children' || key === 'nodeValue') continue;

    const newVal = newProps[key];
    const hadOld = oldProps ? key in oldProps : false;
    const oldVal = oldProps ? oldProps[key] : undefined;

    const eventName = normalizeEventName(key);

    if (eventName !== null) {
      // --- Event handling ---
      if (newVal && !hadOld) {
        // Add new event listener
        bindEvent(el, eventName, newVal as EventListener, delegRoot);
      } else if (!newVal && hadOld) {
        // Remove old event listener
        unbindEvent(el, eventName, oldVal as EventListener, delegRoot);
      } else if (newVal && hadOld && newVal !== oldVal) {
        // Replace event listener
        unbindEvent(el, eventName, oldVal as EventListener, delegRoot);
        bindEvent(el, eventName, newVal as EventListener, delegRoot);
      }
      continue;
    }

    // --- Attribute / Property handling ---
    if (!hadOld && newVal !== undefined) {
      setDOMProperty(el, key, newVal);
    } else if (hadOld && newVal === undefined) {
      removeDOMProperty(el, key);
    } else if (hadOld && newVal !== undefined && newVal !== oldVal) {
      setDOMProperty(el, key, newVal);
    }
  }

  // Invoke ref callback if present
  if (newProps.ref && newProps.ref !== (oldProps?.ref)) {
    (newProps.ref as (el: Element | Text | null) => void)(el);
  }
}

/** Set a single property/attribute on a DOM element */
function setDOMProperty(el: Element, key: string, value: unknown): void {
  if (key === 'style' && typeof value === 'object' && value !== null) {
    Object.assign((el as HTMLElement).style, value);
  } else if (key === 'className' || key === 'class') {
    el.className = String(value);
  } else if (PROPERTY_ATTRIBUTES.has(key)) {
    (el as unknown as Record<string, unknown>)[key] = value;
  } else if (typeof value === 'boolean') {
    if (value) {
      el.setAttribute(key, '');
    } else {
      el.removeAttribute(key);
    }
  } else if (value !== null && value !== undefined) {
    el.setAttribute(key, String(value));
  }
}

/** Remove a single property/attribute from a DOM element */
function removeDOMProperty(el: Element, key: string): void {
  if (PROPERTY_ATTRIBUTES.has(key)) {
    try {
      (el as unknown as Record<string, unknown>)[key] = undefined;
    } catch {
      // Some read-only properties may throw; ignore
    }
  }
  el.removeAttribute(key);
}

// ---------------------------------------------------------------------------
// 4. Event System (Synthetic Events + Delegation + Pooling)
// ---------------------------------------------------------------------------

/** Event pool for recycling synthetic event objects */
const eventPool: PooledEvent[] = [];
const MAX_POOL_SIZE = 20;

/** Root-level delegated event listeners (event type -> Set of handler refs) */
const delegatedListeners = new Map<string, Set<EventListener>>();

/**
 * Obtain a pooled synthetic event, or create one if the pool is empty.
 */
function acquireEvent<E extends Event>(nativeEvent: E, currentTarget: EventTarget | null): PooledEvent<E> {
  let evt: PooledEvent<E>;
  if (eventPool.length > 0) {
    evt = eventPool.pop()!;
    evt.__disposed = false;
  } else {
    evt = {
      nativeEvent,
      currentTarget,
      type: nativeEvent.type,
      target: nativeEvent.target,
      eventPhase: nativeEvent.eventPhase,
      bubbles: nativeEvent.bubbles,
      cancelable: nativeEvent.cancelable,
      defaultPrevented: nativeEvent.defaultPrevented,
      isTrusted: nativeEvent.isTrusted,
      timeStamp: nativeEvent.timeStamp,
      stopImmediatePropagation: () => nativeEvent.stopImmediatePropagation(),
      preventDefault: () => nativeEvent.preventDefault(),
      stopPropagation: () => { (evt as PooledEvent).isPropagationStopped = true; nativeEvent.stopPropagation(); },
      isDefaultPrevented: () => nativeEvent.defaultPrevented,
      isPropagationStopped: false,
      persist: () => { (evt as PooledEvent).__pooled = true; },
      isPersistent: () => (evt as PooledEvent).__pooled,
      __pooled: false,
      __disposed: false,
    } as PooledEvent<E>;
  }
  evt.nativeEvent = nativeEvent;
  evt.currentTarget = currentTarget;
  evt.isPropagationStopped = false;
  return evt;
}

/**
 * Return a synthetic event to the pool for reuse.
 * Only pooled events (via `.persist()` or auto-release) are recycled.
 */
function releaseEvent(evt: PooledEvent): void {
  if (evt.__disposed) return;
  evt.__disposed = true;
  if (eventPool.length < MAX_POOL_SIZE && !evt.__pooled) {
    eventPool.push(evt);
  }
}

/**
 * Bind an event handler to an element.
 * If a delegation root is provided, the handler is registered on the root
 * instead and looked up by target matching at dispatch time.
 */
function bindEvent(
  el: Element,
  eventType: string,
  handler: EventListener,
  delegRoot: Element | null,
): void {
  if (delegRoot) {
    let set = delegatedListeners.get(eventType);
    if (!set) {
      set = new Set();
      delegatedListeners.set(eventType, set);
      // Install a single delegated listener on the root
      delegRoot.addEventListener(eventType, delegatedDispatcher, true);
    }
    // Store handler reference keyed by element identity
    (el as unknown as Record<string, unknown>).__delegatedHandler = handler;
    set.add(handler);
  } else {
    el.addEventListener(eventType, handler);
  }
}

/**
 * Unbind an event handler from an element (or delegation root).
 */
function unbindEvent(
  el: Element,
  eventType: string,
  handler: EventListener,
  delegRoot: Element | null,
): void {
  if (delegRoot) {
    const set = delegatedListeners.get(eventType);
    if (set) {
      set.delete(handler);
      delete (el as unknown as Record<string, unknown>).__delegatedHandler;
      if (set.size === 0) {
        delegatedListeners.delete(eventType);
        delegRoot.removeEventListener(eventType, delegatedDispatcher, true);
      }
    }
  } else {
    el.removeEventListener(eventType, handler);
  }
}

/**
 * Global dispatcher for delegated events.
 * Walks up from the target element, finds the nearest registered handler,
 * wraps the native event in a synthetic event, invokes the handler,
 * then releases the event back to the pool.
 */
function delegatedDispatcher(nativeEvent: Event): void {
  const target = nativeEvent.target as Element | null;
  if (!target) return;

  const eventType = nativeEvent.type;
  let el: Element | null = target;

  while (el) {
    const handler = (el as unknown as Record<string, unknown>).__delegatedHandler as EventListener | undefined;
    if (handler) {
      const synEvt = acquireEvent(nativeEvent, el);
      try {
        handler.call(el, synEvt);
      } finally {
        if (!synEvt.isPersistent()) {
          releaseEvent(synEvt);
        }
      }
      if (synEvt.isPropagationStopped) break;
    }
    el = el.parentElement;
  }
}

// ---------------------------------------------------------------------------
// 5. Diffing Algorithm
// ---------------------------------------------------------------------------

/**
 * Compute the minimal set of patches needed to transform `oldVNode` into `newVNode`.
 *
 * Uses a strategy inspired by React's reconciliation:
 * - Same tag/type -> diff props and children recursively
 * - Different tag/type -> REPLACE_ELEMENT
 * - Keyed lists use a reverse-map O(n) algorithm for reordering
 * - Text nodes compared by content equality
 *
 * @returns Array of Patch objects describing required DOM operations
 */
export function diff(oldVNode: VNode, newVNode: VNode): Patch[] {
  const patches: Patch[] = [];
  walkDiff(oldVNode, newVNode, patches, 0);
  return patches;
}

/** Recursive tree-walking diff engine */
function walkDiff(oldV: VNode, newV: VNode, patches: Patch[], index: number): number {
  // ---- Node type changed -> replace ----
  if (oldV.type !== newV.type) {
    patches.push({ type: PatchType.REPLACE_ELEMENT, vnode: newV, dom: oldV.dom! });
    return index;
  }

  switch (newV.type) {
    case 'text': {
      const oldText = (oldV.props.nodeValue as string) ?? '';
      const newText = (newV.props.nodeValue as string) ?? '';
      if (oldText !== newText) {
        patches.push({ type: PatchType.SET_TEXT, dom: oldV.dom!, newText });
      }
      newV.dom = oldV.dom!;
      return index;
    }

    case 'element': {
      // Tag mismatch -> replace
      if (oldV.tag !== newV.tag) {
        patches.push({ type: PatchType.REPLACE_ELEMENT, vnode: newV, dom: oldV.dom! });
        return index;
      }

      newV.dom = oldV.dom as Element;

      // Diff props
      const propsDiff = computePropsDiff(oldV.props, newV.props);
      if (
        propsDiff.added.size > 0 ||
        propsDiff.removed.size > 0 ||
        Object.keys(propsDiff.changed).length > 0
      ) {
        patches.push({
          type: PatchType.UPDATE_PROPS,
          dom: newV.dom as Element,
          propsDiff,
          vnode: newV,
        });
      }

      // Diff children (with key support)
      diffChildren(oldV, newV, patches, index);
      return index;
    }

    case 'component': {
      // For components, we check if it's the same component function
      if (oldV.tag !== newV.tag) {
        patches.push({ type: PatchType.REPLACE_ELEMENT, vnode: newV, dom: oldV.dom! });
        return index;
      }
      // Component update is handled by reconciliation; here we just flag
      newV.dom = oldV.dom;
      newV.componentInstance = oldV.componentInstance;
      return index;
    }

    case 'fragment': {
      newV.dom = oldV.dom;
      diffChildren(oldV, newV, patches, index);
      return index;
    }

    default:
      return index;
  }
}

/**
 * Diff children arrays with keyed-list optimization.
 *
 * When children have `key` props, builds a map of old children by key and
 * matches them efficiently, producing REORDER_CHILDREN patches instead of
 * full re-creation.
 */
function diffChildren(oldParent: VNode, newParent: VNode, patches: Patch[], _startIndex: number): void {
  const oldCh = oldParent.children;
  const newCh = newParent.children;
  const parentDom = oldParent.dom as Element;

  // Build key map for old children
  const oldKeyed = new Map<string | number, { vnode: VNode; index: number }>();
  const oldUnkeyed: VNode[] = [];

  oldCh.forEach((child, i) => {
    const key = child.props?.key;
    if (key !== undefined && key !== null) {
      oldKeyed.set(key, {vnode: child, index: i});
    } else {
      oldUnkeyed.push(child);
    }
  });

  // Check if any new children have keys
  const hasNewKeys = newCh.some((c) => c.props?.key !== undefined && c.props?.key !== null);

  if (hasNewKeys && oldKeyed.size > 0) {
    // --- Keyed diffing ---
    const newKeyMap = new Map<string | number, VNode>();
    const newOrder: (Element | Text)[] = [];
    let needsReorder = false;

    // First pass: match keyed children
    newCh.forEach((child) => {
      const key = child.props?.key;
      if (key !== undefined && key !== null) {
        newKeyMap.set(key, child);
        const oldEntry = oldKeyed.get(key);
        if (oldEntry) {
          walkDiff(oldEntry.vnode, child, patches, 0);
          if (child.dom) newOrder.push(child.dom);
          oldKeyed.delete(key); // Mark as matched
        } else {
          // New keyed child -> CREATE
          patches.push({ type: PatchType.CREATE_ELEMENT, vnode: child, parentDom, index: newOrder.length });
          needsReorder = true;
        }
      }
    });

    // Remove unmatched old keyed children
    oldKeyed.forEach((entry) => {
      patches.push({ type: PatchType.REMOVE_ELEMENT, dom: entry.vnode.dom!, parentDom });
      needsReorder = true;
    });

    if (needsReorder || newOrder.length > 0) {
      patches.push({
        type: PatchType.REORDER_CHILDREN,
        parentDom,
        childrenOrder: newOrder,
      });
    }
  } else {
    // --- Simple (unkeyed) diffing ---
    const maxLen = Math.max(oldCh.length, newCh.length);

    for (let i = 0; i < maxLen; i++) {
      const oldChild = oldCh[i];
      const newChild = newCh[i];

      if (oldChild && !newChild) {
        // Child removed
        patches.push({ type: PatchType.REMOVE_ELEMENT, dom: oldChild.dom!, parentDom, index: i });
      } else if (!oldChild && newChild) {
        // Child added
        patches.push({ type: PatchType.CREATE_ELEMENT, vnode: newChild, parentDom, index: i });
      } else if (oldChild && newChild) {
        walkDiff(oldChild, newChild, patches, i);
      }
    }
  }
}

/**
 * Compute the difference between two props objects.
 *
 * Returns three categories:
 * - **added**:   props present in `new` but not in `old`
 * - **removed**: prop names present in `old` but not in `new`
 * - **changed**: props present in both but with different values
 */
export function computePropsDiff(oldProps: VNodeProps, newProps: VNodeProps): PropsDiff & { added: VNodeProps } {
  const added: VNodeProps = {};
  const removed = new Set<string>();
  const changed: VNodeProps = {};

  const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

  for (const key of allKeys) {
    if (key === 'key' || key === 'ref' || key === 'children') continue;

    const inOld = key in oldProps;
    const inNew = key in newProps;

    if (!inOld && inNew) {
      added[key] = newProps[key];
    } else if (inOld && !inNew) {
      removed.add(key);
    } else if (inOld && inNew && oldProps[key] !== newProps[key]) {
      changed[key] = newProps[key];
    }
  }

  return { added, removed, changed };
}

// ---------------------------------------------------------------------------
// 6. Patch Application
// ---------------------------------------------------------------------------

/**
 * Apply an array of patches to the real DOM.
 *
 * Each patch describes a single mutation operation. Patches are applied
 * sequentially in order. This is the "commit" phase of the reconciliation.
 */
export function patch(patches: Patch[], delegationRoot?: Element | null): void {
  for (const p of patches) {
    switch (p.type) {
      case PatchType.CREATE_ELEMENT: {
        if (p.vnode) {
          const newEl = createElement(p.vnode, delegationRoot);
          const parent = p.parentDom ?? p.vnode.parent?.dom;
          if (parent && p.index !== undefined) {
            const refChild = parent.childNodes[p.index];
            parent.insertBefore(newEl, refChild ?? null);
          } else if (parent) {
            parent.appendChild(newEl);
          }
        }
        break;
      }

      case PatchType.REMOVE_ELEMENT: {
        if (p.dom && p.dom.parentNode) {
          p.dom.parentNode.removeChild(p.dom);
        }
        break;
      }

      case PatchType.REPLACE_ELEMENT: {
        if (p.vnode && p.dom) {
          const newEl = createElement(p.vnode, delegationRoot);
          if (p.dom.parentNode) {
            p.dom.parentNode.replaceChild(newEl, p.dom);
          }
        }
        break;
      }

      case PatchType.UPDATE_PROPS: {
        if (p.dom && p.propsDiff && p.vnode) {
          applyProps(p.dom as Element, p.vnode.props, p.vnode.oldProps ?? null, delegationRoot ?? null);
          p.vnode.oldProps = {...p.vnode.props};
        }
        break;
      }

      case PatchType.REORDER_CHILDREN: {
        if (p.parentDom && p.childrenOrder) {
          // Clear existing children and re-append in new order
          while (p.parentDom.firstChild) {
            p.parentDom.removeChild(p.parentDom.firstChild);
          }
          p.childrenOrder.forEach((child) => {
            p.parentDom!.appendChild(child);
          });
        }
        break;
      }

      case PatchType.SET_TEXT: {
        if (p.dom) {
          (p.dom as Text).nodeValue = p.newText ?? '';
        }
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Reconciliation Engine (Component Lifecycle + Batching)
// ---------------------------------------------------------------------------

/** Global update queue for batched state updates */
const updateQueue: Array<() => void> = [];
let isBatchingUpdates = false;
let isFlushScheduled = false;

/**
 * Enqueue an update callback. If batching is active, the callback is deferred
 * until the batch completes. Otherwise it runs synchronously.
 */
export function enqueueUpdate(callback: () => void): void {
  updateQueue.push(callback);
  if (!isBatchingUpdates) {
    flushBatchedUpdates();
  } else if (!isFlushScheduled) {
    isFlushScheduled = true;
    scheduler.schedule(() => {
      flushBatchedUpdates();
    }, Priority.NORMAL);
  }
}

/** Execute all queued updates */
function flushBatchedUpdates(): void {
  if (updateQueue.length === 0) return;
  const queue = [...updateQueue];
  updateQueue.length = 0;
  isFlushScheduled = false;
  for (const cb of queue) {
    cb();
  }
}

/**
 * Begin a batch of updates (e.g., during event handling).
 * Updates enqueued during the batch are deferred until `endBatch()` is called.
 */
export function startBatch(): void {
  isBatchingUpdates = true;
}

/**
 * End the current update batch and flush any deferred updates.
 */
export function endBatch(): void {
  isBatchingUpdates = false;
  flushBatchedUpdates();
}

/**
 * Mount a VNode tree into a container DOM element.
 *
 * Creates real DOM nodes, attaches them to the container, invokes component
 * lifecycle hooks (`willMount`, `didMount`), and returns the root VNode.
 */
export function mount(vnode: VNode, container: Element, delegationRoot?: Element): VNode {
  startBatch();
  try {
    // Pre-process: instantiate components, run willMount
    processVNodeForMount(vnode, null);

    // Create DOM
    const dom = createElement(vnode, delegationRoot);
    container.appendChild(dom instanceof DocumentFragment ? dom : dom);

    // Post-mount: invoke didMount hooks
    invokeDidMount(vnode);

    return vnode;
  } finally {
    endBatch();
  }
}

/** Recursively process VNodes before mounting (instantiate components, call willMount) */
function processVNodeForMount(vnode: VNode, parent: VNode | null): void {
  vnode.parent = parent;

  if (vnode.type === 'component') {
    const CompFn = vnode.tag as ComponentFunction;
    const instance = createComponentInstance(CompFn, vnode.props);
    vnode.componentInstance = instance;

    if (instance.willMount) {
      instance.willMount();
    }

    // Render the component to get its output VNode
    const rendered = CompFn(vnode.props);
    instance._currentElement = rendered;
    instance._vnode = rendered;

    // Recursively process the rendered output
    processVNodeForMount(rendered, vnode);
    vnode.children = [rendered];
  } else if (vnode.type === 'element' || vnode.type === 'fragment') {
    vnode.children.forEach((child) => processVNodeForMount(child, vnode));
  }
}

/** Recursively invoke didMount on all component instances */
function invokeDidMount(vnode: VNode): void {
  if (vnode.type === 'component' && vnode.componentInstance) {
    vnode.componentInstance.isMounted = true;
    if (vnode.componentInstance.didMount) {
      vnode.componentInstance.didMount();
    }
    // Also invoke on rendered children
    if (vnode.componentInstance._currentElement) {
      invokeDidMount(vnode.componentInstance._currentElement);
    }
  } else {
    vnode.children.forEach(invokeDidMount);
  }
}

/**
 * Update an already-mounted VNode tree with a new VNode.
 *
 * Diffs the trees, computes patches, applies them, and runs component
 * lifecycle hooks (`willUpdate`, `didUpdate`).
 */
export function updateTree(oldVNode: VNode, newVNode: VNode, delegationRoot?: Element): VNode {
  startBatch();
  try {
    // Run willUpdate on components
    invokeWillUpdate(oldVNode, newVNode);

    // Snapshot old props for diffing
    snapshotOldProps(oldVNode);

    // Compute and apply patches
    const patches = diff(oldVNode, newVNode);
    patch(patches, delegationRoot);

    // Run didUpdate
    invokeDidUpdate(oldVNode, newVNode);

    return newVNode;
  } finally {
    endBatch();
  }
}

/** Snapshot oldProps onto each VNode for subsequent prop-diffing */
function snapshotOldProps(vnode: VNode): void {
  vnode.oldProps = {...vnode.props};
  vnode.children.forEach(snapshotOldProps);
}

/** Invoke willUpdate lifecycle hook on component nodes */
function invokeWillUpdate(oldV: VNode, newV: VNode): void {
  if (oldV.type === 'component' && oldV.componentInstance) {
    const inst = oldV.componentInstance;
    if (inst.willUpdate) {
      inst.willUpdate(inst.props);
    }
  }
  if (newV.type === 'component' && newV.children.length > 0) {
    invokeWillUpdate(oldV, newV.children[0]);
  } else {
    oldV.children.forEach((oc, i) => {
      const nc = newV.children[i];
      if (nc) invokeWillUpdate(oc, nc);
    });
  }
}

/** Invoke didUpdate lifecycle hook on component nodes */
function invokeDidUpdate(_oldV: VNode, newV: VNode): void {
  if (newV.type === 'component' && newV.componentInstance) {
    const inst = newV.componentInstance;
    if (inst.didUpdate) {
      inst.didUpdate(inst.props);
    }
  }
  newV.children.forEach((child) => invokeDidUpdate(child, child));
}

/**
 * Unmount a VNode tree, cleaning up DOM and invoking `willUnmount`.
 */
export function unmount(vnode: VNode): void {
  invokeWillUnmount(vnode);
  if (vnode.dom && vnode.dom.parentNode) {
    vnode.dom.parentNode.removeChild(vnode.dom);
  }
  vnode.dom = null;
}

/** Recursively invoke willUnmount on all component instances */
function invokeWillUnmount(vnode: VNode): void {
  if (vnode.type === 'component' && vnode.componentInstance) {
    const inst = vnode.componentInstance;
    if (inst.willUnmount) {
      inst.willUnmount();
    }
    inst.isMounted = false;
    inst._vnode = null;
    inst._currentElement = null;
  }
  vnode.children.forEach(invokeWillUnmount);
}

/** Create a component instance from a component function */
function createComponentInstance<P>(
  compFn: ComponentFunction<P>,
  props: P,
): ComponentInstance<P> {
  let currentState: Record<string, unknown> = {};

  const instance: ComponentInstance<P> = {
    props,
    state: currentState,
    isMounted: false,
    _vnode: null,
    _currentElement: null,

    setState(partial, callback) {
      currentState = {...currentState, ...partial};
      enqueueUpdate(() => {
        // Trigger re-render would happen here in a full framework
        if (callback) callback();
      });
    },

    forceUpdate(callback) {
      enqueueUpdate(() => {
        if (callback) callback();
      });
    },
  };

  return instance;
}

// ---------------------------------------------------------------------------
// 8. Error Boundaries
// ---------------------------------------------------------------------------

/**
 * Render a VNode within an error boundary context.
 *
 * If rendering throws, the error is caught and passed to the boundary's
 * `didCatch` callback. If a fallback UI is provided, it is rendered instead.
 *
 * @param renderFn     - Function that produces a VNode (may throw)
 * @param errorBoundary - Optional component instance with `didCatch` method
 * @param fallbackVNode - Fallback VNode to display on error
 * @returns The rendered VNode, or the fallback on error
 */
export function renderWithErrorBoundary(
  renderFn: () => VNode,
  errorBoundary?: { didCatch?(error: Error, info: ErrorInfo): void },
  fallbackVNode?: VNode,
): VNode {
  try {
    return renderFn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    if (errorBoundary?.didCatch) {
      const info: ErrorInfo = { componentStack: captureComponentStack(error) };
      errorBoundary.didCatch(err, info);
    }

    if (fallbackVNode) {
      return fallbackVNode;
    }

    // Default error fallback
    return h('div', { style: { color: 'red', border: '1px solid red', padding: '8px' } }, [
      createTextVNode(`Error: ${err.message}`),
    ]);
  }
}

/** Capture a basic component stack trace from an error */
function captureComponentStack(error: unknown): string {
  if (error instanceof Error && error.stack) {
    return error.stack.split('\n').slice(0, 10).join('\n');
  }
  return String(error);
}

// ---------------------------------------------------------------------------
// 9. Scheduler (Priority Levels + RAF + Work Interruption)
// ---------------------------------------------------------------------------

/**
 * Cooperative scheduler inspired by React's scheduler / `scheduler` package.
 *
 * Features:
 * - Priority levels (HIGH > NORMAL > LOW)
 * - RequestAnimationFrame-based scheduling
 * - Work chunking with yielding to main thread
 * - Cancellation support
 */
export const scheduler = (() => {
  let workIdCounter = 0;
  const workQueue: ScheduledWork[] = [];
  let rafId: number | null = null;
  let isProcessing = false;

  /**
   * Schedule a callback to be executed.
   * Higher-priority work is executed first. Within the same priority,
   * earlier-scheduled work runs first (FIFO).
   */
  function schedule(callback: () => void, priority: Priority = Priority.NORMAL): number {
    const id = ++workIdCounter;
    const now = performance.now();
    const work: ScheduledWork = {
      id,
      priority,
      callback,
      deadline: now + (priority === Priority.HIGH ? 5 : priority === Priority.NORMAL ? 16 : 100),
      cancelled: false,
    };

    // Insert sorted by priority (lower number = higher priority), stable sort by id
    let inserted = false;
    for (let i = 0; i < workQueue.length; i++) {
      if (workQueue[i].priority > work.priority ||
          (workQueue[i].priority === work.priority && workQueue[i].id > id)) {
        workQueue.splice(i, 0, work);
        inserted = true;
        break;
      }
    }
    if (!inserted) workQueue.push(work);

    ensureProcessing();
    return id;
  }

  /** Cancel a previously scheduled work item */
  function cancelWork(id: number): void {
    const idx = workQueue.findIndex((w) => w.id === id);
    if (idx !== -1) {
      workQueue[idx].cancelled = true;
      workQueue.splice(idx, 1);
    }
  }

  /** Ensure the processing loop is running */
  function ensureProcessing(): void {
    if (isProcessing) return;
    isProcessing = true;
    rafId = requestAnimationFrame(processLoop);
  }

  /**
   * Main processing loop.
   * Processes work items in priority order, yielding to the main thread
   * when the frame budget is exceeded.
   */
  function processLoop(): void {
    const frameDeadline = performance.now() + 5; // ~5ms budget per frame

    while (workQueue.length > 0) {
      // Check if we should yield
      if (performance.now() >= frameDeadline) {
        // Yield and resume next frame
        rafId = requestAnimationFrame(processLoop);
        return;
      }

      const work = workQueue.shift()!;
      if (work.cancelled) continue;

      try {
        work.callback();
      } catch (err) {
        console.error('[VDOM Scheduler] Work callback threw:', err);
      }
    }

    // Queue empty
    isProcessing = false;
    rafId = null;
  }

  return { schedule, cancelWork, ensureProcessing };
})();

// ---------------------------------------------------------------------------
// 10. Fiber-like Architecture (Units of Work + Yielding + Resumption)
// ---------------------------------------------------------------------------

/** Current fiber work-in-progress root */
let workInProgressRoot: VNodeWork | null = null;
let nextUnitOfWork: VNodeWork | null = null;

/**
 * Begin a fiber-style reconciliation pass.
 *
 * Instead of building the entire diff tree synchronously, this processes
 * the tree in small units of work ("fibers"), yielding to the main thread
 * between units so the UI remains responsive.
 *
 * @param rootVNode - The root VNode to reconcile
 * @param callback  - Called when reconciliation completes
 */
export function beginFiberWork(rootVNode: VNode, callback?: () => void): void {
  const rootWork: VNodeWork = {
    vnode: rootVNode,
    pendingProps: rootVNode.props,
    effectTag: null,
    nextEffect: null,
  };

  workInProgressRoot = rootWork;
  nextUnitOfWork = rootWork;

  scheduler.schedule(() => {
    performWork(callback);
  }, Priority.HIGH);
}

/**
 * Perform one unit of fiber work, then either continue or yield.
 */
function performWork(onComplete?: () => void): void {
  const startTime = performance.now();
  const frameBudget = 5; // ms

  while (nextUnitOfWork) {
    // Check if we need to yield
    if (performance.now() - startTime > frameBudget) {
      // Resume later
      scheduler.schedule(() => performWork(onComplete), Priority.HIGH);
      return;
    }

    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }

  // All work complete -- commit phase
  if (workInProgressRoot) {
    commitWork(workInProgressRoot);
  }
  workInProgressRoot = null;
  onComplete?.();
}

/**
 * Process a single unit of work (one VNode).
 * Returns the next unit of work, or null if done.
 */
function performUnitOfWork(work: VNodeWork): VNodeWork | null {
  const vnode = work.vnode;

  // Begin phase: process this node
  beginWork(work);

  // If this node has children, return the first child as next unit
  if (vnode.children.length > 0) {
    const childWork: VNodeWork = {
      vnode: vnode.children[0],
      pendingProps: vnode.children[0].props,
      effectTag: null,
      nextEffect: null,
    };
    work.nextEffect = childWork;
    return childWork;
  }

  // No children -- complete this node and move to sibling
  return completeWork(work);
}

/** Begin work on a fiber unit (begin phase) */
function beginWork(work: VNodeWork): void {
  const vnode = work.vnode;

  if (vnode.type === 'component') {
    // Process component instantiation
    if (!vnode.componentInstance) {
      const CompFn = vnode.tag as ComponentFunction;
      vnode.componentInstance = createComponentInstance(CompFn, vnode.props);
      const rendered = CompFn(vnode.props);
      vnode.componentInstance._currentElement = rendered;
      vnode.children = [rendered];
      work.effectTag = PatchType.UPDATE_PROPS;
    }
  }

  // Link children as siblings
  for (let i = 0; i < vnode.children.length - 1; i++) {
    const siblingWork: VNodeWork = {
      vnode: vnode.children[i + 1],
      pendingProps: vnode.children[i + 1].props,
      effectTag: null,
      nextEffect: null,
    };
    // Will be picked up in completeWork
  }
}

/** Complete work on a fiber unit (complete phase) */
function completeWork(work: VNodeWork): VNodeWork | null {
  // Move to sibling if exists
  if (work.nextEffect) {
    return work.nextEffect;
  }

  // No sibling -- bubble up to parent
  let parentWork = findParentWork(work);
  while (parentWork) {
    const sibling = findNextSibling(parentWork, work.vnode);
    if (sibling) {
      return sibling;
    }
    work = parentWork;
    parentWork = findParentWork(parentWork);
  }

  return null; // Root reached -- done
}

/** Find the parent work unit (walks up via VNode.parent) */
function findParentWork(work: VNodeWork): VNodeWork | null {
  const parentVNode = work.vnode.parent;
  if (!parentVNode) return null;
  // Find existing work unit for parent, or create a stub
  let w = workInProgressRoot;
  while (w) {
    if (w.vnode === parentVNode) return w;
    w = w.nextEffect!;
  }
  return null;
}

/** Find the next sibling VNode of the given VNode under the same parent */
function findNextSibling(parentWork: VNodeWork, afterVNode: VNode): VNodeWork | null {
  const siblings = parentWork.vnode.children;
  const idx = siblings.indexOf(afterVNode);
  if (idx === -1 || idx >= siblings.length - 1) return null;

  return {
    vnode: siblings[idx + 1],
    pendingProps: siblings[idx + 1].props,
    effectTag: null,
    nextEffect: null,
  };
}

/** Commit phase: apply all accumulated effects to the real DOM */
function commitWork(rootWork: VNodeWork): void {
  const patches: Patch[] = [];
  collectEffects(rootWork, patches);
  if (patches.length > 0) {
    patch(patches);
  }
}

/** Recursively collect effects from the fiber tree into a flat patch array */
function collectEffects(work: VNodeWork, patches: Patch[]): void {
  if (work.effectTag) {
    // Convert fiber effect to patch (simplified)
    patches.push({
      type: work.effectTag,
      vnode: work.vnode,
      dom: work.vnode.dom!,
    });
  }
  if (work.nextEffect) {
    collectEffects(work.nextEffect, patches);
  }
}

// ---------------------------------------------------------------------------
// 11. Memoization
// ---------------------------------------------------------------------------

/**
 * Wrap a component function with memoization.
 *
 * The wrapped component will skip re-rendering if its props haven't changed
 * according to the comparison function (shallow equality by default).
 *
 * @param comp    - The component function to memoize
 * @param compare - Custom comparison function (defaults to shallowEqual)
 * @returns A memoized component wrapper
 *
 * @example
 * ```ts
 * const ExpensiveList = memo(({ items }) => {
 *   return h('ul', {}, items.map(item => h('li', {}, [item.name])));
 * }, (prev, next) => prev.items === next.items);
 * ```
 */
export function memo<P>(
  comp: ComponentFunction<P>,
  compare?: MemoCompareFunction<P>,
): MemoizedComponent<P> {
  const memoizedComp = ((props: P): VNode => {
    const wrapper = (memoizedComp as unknown as { _lastProps?: P; _lastResult?: VNode });

    const shouldCompare = compare ?? shallowEqual;
    if (wrapper._lastProps !== undefined && shouldCompare(wrapper._lastProps, props)) {
      return wrapper._lastResult!;
    }

    const result = comp(props);
    wrapper._lastProps = {...props};
    wrapper._lastResult = result;
    return result;
  }) as MemoizedComponent<P>;

  memoizedComp.compare = compare;
  memoizedComp.displayName = (comp as unknown as { displayName?: string }).displayName ?? comp.name ?? 'Memo';

  return memoizedComp;
}

/**
 * Shallow equality comparison for two arbitrary values.
 *
 * Returns `true` if `a` and `b` are strictly equal, or if they are
 * arrays/objects with the same shallow keys/values.
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => val === b[i]);
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => (a as Record<string, unknown>)[key] === (b as Record<string, unknown>)[key]);
  }

  return false;
}

// ---------------------------------------------------------------------------
// 12. Context API
// ---------------------------------------------------------------------------

/** Stack of active context providers for nested provider support */
const contextStack = new Map<symbol, unknown>();

/**
 * Create a new context with a default value.
 *
 * Returns a Context object containing `Provider` and `Consumer` components.
 * Values flow down through the component tree from the nearest Provider.
 *
 * @example
 * ```ts
 * const ThemeContext = createContext({ mode: 'light' });
 *
 * // In a parent:
 * h(ThemeContext.Provider, { value: { mode: 'dark' } }, [children])
 *
 * // In a consumer:
 * h(ThemeContext.Consumer, {}, [(ctx) => h('div', { class: ctx.mode })])
 * ```
 */
export function createContext<T>(defaultValue: T): Context<T> {
  const id = Symbol(`Context_${globalVNodeId++}`);

  const subscribers = new Set<(value: T) => void>();

  const ctx: Context<T> = {
    id,
    defaultValue,
    _subscribers: subscribers,
    _currentValue: defaultValue,

    Provider({ value, children }: { value: T; children: VNode[] }): VNode {
      // Push onto context stack
      const previousValue = contextStack.get(id);
      contextStack.set(id, value);
      ctx._currentValue = value;

      // Notify subscribers
      subscribers.forEach((fn) => {
        try { fn(value); } catch { /* ignore subscriber errors */ }
      });

      // Render children (fragment)
      const frag = Fragment({ children: children ?? [] });

      // Pop context stack after render (conceptually; in practice handled by unmount)
      // We store the previous value for cleanup
      (frag as unknown as Record<string, unknown>).__contextRestore = () => {
        if (previousValue !== undefined) {
          contextStack.set(id, previousValue);
        } else {
          contextStack.delete(id);
        }
        ctx._currentValue = previousValue ?? defaultValue;
      };

      return frag;
    },

    Consumer({ children }: { children: (value: T) => VNode }): VNode {
      const currentValue = contextStack.get(id) as T ?? defaultValue;
      return children(currentValue);
    },
  };

  return ctx;
}

/**
 * Read the current value of a context outside of a Consumer component.
 *
 * Useful for accessing context values in lifecycle hooks or event handlers.
 *
 * @throws Error if the context has no Provider ancestor and no default was set
 */
export function readContext<T>(context: Context<T>): T {
  const value = contextStack.get(context.id) as T | undefined;
  return value ?? context.defaultValue;
}

/**
 * Subscribe to context value changes.
 *
 * @param context  - The context to subscribe to
 * @param callback - Called whenever the context value changes
 * @returns Unsubscribe function
 */
export function subscribeToContext<T>(context: Context<T>, callback: (value: T) => void): () => void {
  context._subscribers.add(callback);
  return () => { context._subscribers.delete(callback); };
}

// ---------------------------------------------------------------------------
// 13. Dev Tools Integration Hook
// ---------------------------------------------------------------------------

/**
 * Create a React DevTools-compatible global hook structure.
 *
 * This allows the VDOM renderer to appear in React DevTools extensions
 * for inspection purposes. The hook implements the subset of the interface
 * that DevTools uses to discover and inspect renderers.
 *
 * @returns A DevToolsHook instance assignable to `window.__REACT_DEVTOOLS_GLOBAL_HOOK__`
 */
export function createDevToolsHook(): DevToolsHook {
  const hook: DevToolsHook = {
    renderers: new Map(),
    _renderers: new Map(),
    _listeners: new Map(),
    supportsFiber: true,

    emit(event: string, ...args: unknown[]): void {
      const listeners = hook._listeners.get(event);
      if (listeners) {
        listeners.forEach((fn) => {
          try { fn(...args); } catch (e) { console.error('[VDOM DevTools] Listener error:', e); }
        });
      }
    },

    inject(backend: unknown): void {
      hook.emit('inject', backend);
    },
  };

  // Expose on window for DevTools discovery
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook;
  }

  return hook;
}

/**
 * Register a VDOM renderer instance with the DevTools hook.
 *
 * @param hook     - The DevTools hook (from `createDevToolsHook`)
 * @param rendererId - Unique ID for this renderer instance
 * @param container - The root container element
 * @param rootNode  - The root VNode of the rendered tree
 */
export function registerRendererWithDevTools(
  hook: DevToolsHook,
  rendererId: number,
  container: Element,
  rootNode: VNode,
): void {
  const renderer = {
    findDOMNode(instance: unknown): Element | Text | null {
      if (instance && typeof instance === 'object' && 'dom' in instance) {
        return (instance as VNode).dom;
      }
      return null;
    },

    getPublicInstance(instance: unknown): unknown {
      return instance;
    },

    onCommitFiberRoot(id: number, root: unknown, ...rest: unknown[]): void {
      hook.emit('commitFiberRoot', id, root, ...rest);
    },

    onScheduleWork(root: unknown, ...rest: unknown[]): void {
      hook.emit('scheduleWork', root, ...rest);
    },
  };

  hook.renderers.set(rendererId, renderer);
  hook._renderers.set(rendererId, { container, rootNode, renderer });

  hook.emit('rendererAttached', rendererId, renderer);
}

// ---------------------------------------------------------------------------
// 14. High-Level Renderer (convenience entry point)
// ---------------------------------------------------------------------------

/** Options for creating a VDOM renderer instance */
export interface VDOMRendererOptions {
  container: Element;
  enableEventDelegation?: boolean;
  enableErrorBoundary?: boolean;
  fallbackOnError?: VNode;
  enableDevTools?: boolean;
  schedulerPriority?: Priority;
}

/**
 * Create a fully-configured VDOM renderer bound to a container element.
 *
 * This is the primary entry point for using this library as a mini-framework.
 * It encapsulates mounting, updating, unmounting, event delegation, error
 * boundaries, and optional DevTools integration.
 *
 * @example
 * ```ts
 * const renderer = createRenderer({ container: document.getElementById('app')! });
 * renderer.render(h('div', { class: 'app' }, [h('h1', {}, ['Hello'])]));
 * // Later:
 * renderer.render(h('div', { class: 'app updated' }, [h('h1', {}, ['World'])]));
 * renderer.destroy();
 * ```
 */
export function createRenderer(options: VDOMRendererOptions): {
  render(vnode: VNode): void;
  update(vnode: VNode): void;
  destroy(): void;
  getCurrentVNode(): VNode | null;
} {
  const {
    container,
    enableEventDelegation = true,
    enableErrorBoundary = false,
    fallbackOnError,
    enableDevTools = false,
    schedulerPriority = Priority.NORMAL,
  } = options;

  const delegationRoot = enableEventDelegation ? container : null;
  let currentVNode: VNode | null = null;
  let devToolsHook: DevToolsHook | null = null;
  let rendererId = 0;

  if (enableDevTools) {
    devToolsHook = createDevToolsHook();
    rendererId = Date.now();
  }

  function render(vnode: VNode): void {
    // Clean up previous tree
    if (currentVNode) {
      unmount(currentVNode);
    }

    const renderFn = (): VNode => vnode;
    const finalVNode = enableErrorBoundary
      ? renderWithErrorBoundary(renderFn, undefined, fallbackOnError)
      : vnode;

    currentVNode = mount(finalVNode, container, delegationRoot ?? undefined);

    if (devToolsHook && currentVNode) {
      registerRendererWithDevTools(devToolsHook, rendererId, container, currentVNode);
    }
  }

  function update(vnode: VNode): void {
    if (!currentVNode) {
      render(vnode);
      return;
    }

    const renderFn = (): VNode => vnode;
    const finalVNode = enableErrorBoundary
      ? renderWithErrorBoundary(renderFn, undefined, fallbackOnError)
      : vnode;

    scheduler.schedule(() => {
      currentVNode = updateTree(currentVNode!, finalVNode, delegationRoot ?? undefined);
    }, schedulerPriority);
  }

  function destroy(): void {
    if (currentVNode) {
      unmount(currentVNode);
      currentVNode = null;
    }
    // Clean up delegated listeners
    if (delegationRoot) {
      for (const [eventType] of delegatedListeners) {
        delegationRoot.removeEventListener(eventType, delegatedDispatcher, true);
      }
      delegatedListeners.clear();
    }
  }

  function getCurrentVNode(): VNode | null {
    return currentVNode;
  }

  return { render, update, destroy, getCurrentVNode };
}

// ---------------------------------------------------------------------------
// 15. Exports Summary
// ---------------------------------------------------------------------------

// Re-export everything at the top level for convenient imports:

// Types
export type {
  VNodeProps,
  ComponentFunction,
  ComponentLifecycle,
  ComponentInstance,
  ErrorInfo,
  Patch,
  PropsDiff,
  SyntheticEvent,
  Context,
  MemoCompareFunction,
  MemoizedComponent,
  DevToolsHook,
  VNodeWork,
  ScheduledWork,
  RendererConfig,
  VDOMRendererOptions,
};

// Enums / Constants
export { PROPERTY_ATTRIBUTES, EVENT_HANDLER_RE };

// Factories
export { createElement, applyProps, computePropsDiff, patch, mount, updateTree, unmount };
export { beginFiberWork, performWork, performUnitOfWork, completeWork, commitWork, collectEffects };
export { createDevToolsHook, registerRendererWithDevTools, createRenderer };
export { acquireEvent, releaseEvent, bindEvent, unbindEvent, delegatedDispatcher };
export { enqueueUpdate, startBatch, endBatch, flushBatchedUpdates };
export { createComponentInstance, processVNodeForMount, invokeDidMount, invokeWillUpdate, invokeDidUpdate, invokeWillUnmount };
export { renderWithErrorBoundary, captureComponentStack };
export { readContext, subscribeToContext };
export { shallowEqual, setDOMProperty, removeDOMProperty, findParentWork, findNextSibling, walkDiff, diffChildren };
