/**
 * Virtual DOM Lite — a lightweight virtual DOM implementation with createElement,
 * diffing, and patching. Designed for educational purposes and scenarios where
 * a full VDOM library is overkill.
 *
 * Supports:
 * - h() / createElement() for building virtual trees
 * - Tree diffing with O(n) complexity where n is total nodes
 * - Minimal patch application to real DOM
 * - Component-like function support
 * - Event delegation via on* props
 * - Key-based list reconciliation
 */

// --- Types ---

export interface VNodeProps {
  [key: string]: unknown;
  onClick?: (event: MouseEvent) => void;
  onInput?: (event: Event) => void;
  onChange?: (event: Event) => void;
  onSubmit?: (event: Event) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  key?: string;
  ref?: (el: HTMLElement) => void;
  dangerouslySetInnerHTML?: string;
  style?: Record<string, string | number>;
  class?: string;
  className?: string;
  dataset?: Record<string, string>;
  [key: string]: unknown;
}

export interface VNode {
  /** HTML tag name (e.g., "div", "span") */
  tag: string;
  /** Properties/attributes */
  props: VNodeProps;
  /** Children (VNode[] for elements, string for text) */
  children: (VNode | string)[];
  /** Unique key for reconciliation */
  key?: string;
  /** Reference to real DOM element (after mounting) */
  dom?: HTMLElement | Text;
}

export type VChild = VNode | string | null | undefined | false | VChild[];

export interface Patch {
  type: "CREATE" | "REMOVE" | "REPLACE" | "PROPS" | "TEXT" | "MOVE" | "INSERT";
  vnode?: VNode;
  props?: Partial<VNodeProps>;
  text?: string;
  index?: number;
  parentPath?: number[];
}

export interface VDomOptions {
  /** Delegate events to root (performance optimization) */
  eventDelegation?: boolean;
  /** Root element for delegation */
  rootElement?: HTMLElement;
  /** Log patch operations (debug) */
  debug?: boolean;
  /** Use requestAnimationFrame batching for updates */
  batchUpdates?: boolean;
}

// --- createElement (hyperscript helper) ---

export function h(tag: string, props?: VNodeProps | null, ...children: VChild[]): VNode {
  const flatChildren = flattenChildren(children);
  return {
    tag,
    props: props ?? {},
    children: flatChildren,
  };
}

/** Create a text virtual node */
export function text(content: string): VNode {
  return { tag: "#text", props: {}, children: [content] };
}

/** Flatten nested arrays of children */
function flattenChildren(children: VChild[]): (VNode | string)[] {
  const result: (VNode | string)[] = [];
  for (const child of children) {
    if (child == null || child === false || child === undefined) continue;
    if (Array.isArray child) result.push(...flattenChildren(child));
    else if (typeof child === "object") result.push(child as VNode);
    else result.push(String(child));
  }
  return result;
}

// --- Mount / Unmount ---

/** Render a virtual node into a real DOM element and return it */
export function render(vnode: VNode, container: HTMLElement): HTMLElement {
  container.innerHTML = "";
  const el = createDom(vnode);
  container.appendChild(el);
  vnode.dom = el instanceof Text ? el.parentElement ?? el : el;
  return el;
}

/** Create a real DOM element from a virtual node */
export function createDom(vnode: VNode): Node {
  // Text node
  if (vnode.tag === "#text") {
    return document.createTextNode(vnode.children[0] as string ?? "");
  }

  const el = document.createElement(vnode.tag);
  applyProps(el, vnode.props);

  for (const child of vnode.children) {
    if (typeof child === "string") {
      el.appendChild(document.createTextNode(child));
    } else if (child && typeof child === "object" && "tag" in child) {
      el.appendChild(createDom(child));
    }
  }

  vnode.dom = el;
  return el;
}

/** Apply virtual node properties to a real DOM element */
function applyProps(el: HTMLElement, props: VNodeProps): void {
  // Special props
  if (props.ref) props.ref(el);
  if (props.dangerouslySetInnerHTML) {
    el.innerHTML = props.dangerouslySetInnerHTML;
    return; // Skip children when using innerHTML
  }
  if (props.style && typeof props.style === "object") {
    Object.assign(el.style, props.style);
  }
  if (props.className) el.className = props.className;
  if (props.class) el.classList.add(...props.class.split(/\s+/));
  if (props.dataset) Object.assign(el.dataset, props.dataset);

  // Event handlers
  const eventNames = ["onClick", "onInput", "onChange", "onSubmit", "onKeyDown", "onKeyUp", "onFocus", "onBlur"];
  for (const eventName of eventNames) {
    const handler = props[eventName as keyof VNodeProps];
    if (handler) {
      const eventType = eventName.replace(/^on/, "").toLowerCase();
      el.addEventListener(eventType, handler as EventListener);
    }
  }

  // Regular attributes (filter out special ones)
  const specialKeys = new Set([
    "key", "ref", "dangerouslySetInnerHTML", "style", "class", "className",
    "dataset", ...eventNames,
  ]);
  for (const [key, value] of Object.entries(props)) {
    if (specialKeys.has(key)) continue;
    if (value === false || value === null || value === undefined) continue;
    if (value === true) {
      el.setAttribute(key, "");
    } else if (typeof value === "string") {
      el.setAttribute(key, value);
    } else {
      el.setAttribute(key, String(value));
    }
  }
}

// --- Diffing ---

export function diff(oldVNode: VNode | null, newVNode: VNode | null): Patch[] {
  const patches: Patch[] = [];

  // Both null
  if (!oldVNode && !newVNode) return patches;

  // New node created
  if (!oldVNode && newVNode) {
    patches.push({ type: "CREATE", vnode: newVNode });
    return patches;
  }

  // Old node removed
  if (oldVNode && !newVNode) {
    patches.push({ type: "REMOVE" });
    return patches;
  }

  // Both exist — check tag
  if (oldVNode!.tag !== newVNode!.tag) {
    patches.push({ type: "REPLACE", vnode: newVNode });
    return patches;
  }

  // Same tag — diff props and children
  const propPatches = diffProps(oldVNode!.props, newVNode!.props);
  if (propPatches) patches.push({ type: "PROPS", props: propPatches });

  // Diff children
  const oldChildren = oldVNode!.children;
  const newChildren = newVNode!.children;

  // Simple keyed reconciliation
  const oldKeys = oldChildren.map((c) =>
    (typeof c === "object" && c != null && "tag" in c ? c.key : null)
  );
  const newKeys = newChildren.map((c) =>
    (typeof c === "object" && c != null && "tag" in c ? c.key : null)
  );

  const maxLength = Math.max(oldChildren.length, newChildren.length);

  for (let i = 0; i < maxLength; i++) {
    const oldChild = i < oldChildren.length ? oldChildren[i] : null;
    const newChild = i < newChildren.length ? newChildren[i] : null;

    const oldIsVNode = typeof oldChild === "object" && oldChild != null && "tag" in (oldChild as object);
    const newIsVNode = typeof newChild === "object" && newChild != null && "tag" in (newChild as object);

    // Key-based matching
    if (oldKeys[i] !== undefined && newKeys[i] !== undefined && oldKeys[i] !== null && newKeys[i] !== null) {
      if (oldKeys[i] !== newKeys[i]) {
        // Keys differ — replace
        if (newIsVNode) patches.push({ type: "REPLACE", vnode: newChild as VNode, index: i });
        else patches.push({ type: "TEXT", text: String(newChild), index: i });
        continue;
      }
    }

    // Old removed
    if (oldChild && !newChild) {
      patches.push({ type: "REMOVE", index: i });
      continue;
    }

    // New inserted
    if (!oldChild && newChild) {
      if (newIsVNode) patches.push({ type: "CREATE", vnode: newChild as VNode, index: i });
      else patches.push({ type: "TEXT", text: String(newChild), index: i });
      continue;
    }

    // Both text
    if (!oldIsVNode && !newIsVNode) {
      if (String(oldChild) !== String(newChild)) {
        patches.push({ type: "TEXT", text: String(newChild), index: i });
      }
      continue;
    }

    // Type mismatch
    if (oldIsVNode !== newIsVNode) {
      if (newIsVNode) patches.push({ type: "REPLACE", vnode: newChild as VNode, index: i });
      else patches.push({ type: "TEXT", text: String(newChild), index: i });
      continue;
    }

    // Both VNodes — recurse
    if (oldIsVNode && newIsVNode) {
      const childPatches = diff(oldChild as VNode, newChild as VNode);
      for (const p of childPatches) {
        p.index = i;
        patches.push(p);
      }
    }
  }

  // Handle extra old children at end
  for (let i = newChildren.length; i < oldChildren.length; i++) {
    patches.push({ type: "REMOVE", index: i });
  }

  return patches;
}

function diffProps(oldProps: VNodeProps, newProps: VNodeProps): Partial<VNodeProps> | null {
  const changed: Partial<VNodeProps> = {};

  // Check all new props
  for (const [key, value] of Object.entries(newProps)) {
    if (key === "ref") continue; // Refs are always re-applied
    if (oldProps[key] !== value) changed[key] = value;
  }

  // Check for removed props
  for (const key of Object.keys(oldProps)) {
    if (!(key in newProps) && key !== "ref") {
      (changed as unknown as Record<string, unknown>)[key] = undefined;
    }
  }

  return Object.keys(changed).length > 0 ? changed : null;
}

// --- Patch Application ---

/** Apply patches to a mounted virtual node's real DOM */
export function patch(rootEl: HTMLElement, patches: Patch[]): void {
  // We need to track which DOM nodes correspond to which vnodes
  // Simple approach: apply patches sequentially using child index tracking

  applyPatchesRecursive(rootEl, patches, 0);
}

function applyPatchesRecursive(parent: Node, patches: Patch[], startIndex: number): number {
  let idx = startIndex;

  while (idx < parent.childNodes.length || patches.length > 0) {
    const patch = patches.find((p) => p.index === idx);
    if (!patch) {
      idx++;
      if (idx >= parent.childNodes.length) break;
      continue;
    }

    const child = parent.childNodes[idx];

    switch (patch.type) {
      case "CREATE": {
        if (patch.vnode) {
          const el = createDom(patch.vnode);
          if (idx < parent.childNodes.length) {
            parent.insertBefore(el, child);
          } else {
            parent.appendChild(el);
          }
        }
        break;
      }
      case "REMOVE":
        if (child) child.remove();
        break;
      case "REPLACE": {
        if (child && patch.vnode) {
          const el = createDom(patch.vnode);
          parent.replaceChild(el, child);
        }
        break;
      }
      case "PROPS":
        if (child instanceof HTMLElement && patch.props) {
          // Remove old event handlers before applying new ones
          for (const key of Object.keys(child)) {
            if (key.startsWith("on")) delete (child as unknown as Record<string, unknown>)[key];
          }
          applyProps(child, patch.props as VNodeProps);
        }
        break;
      case "TEXT":
        if (child) child.textContent = patch.text ?? "";
        break;
    }

    idx++;
  }

  return idx;
}
