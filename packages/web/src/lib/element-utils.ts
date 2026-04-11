/**
 * Element Utilities: Higher-level element inspection, modification,
 * attribute management, class toggling, data attributes, visibility
 * control, element cloning, and state management.
 */

// --- Types ---

export interface ElementInfo {
  tag: string;
  id: string;
  classes: string[];
  attributes: Record<string, string>;
  dataAttributes: Record<string, string>;
  ariaAttributes: Record<string, string>;
  styles: Record<string, string>;
  textContent: string;
  innerHTML: string;
  childCount: number;
  isVisible: boolean;
  isInDOM: boolean;
}

export interface VisibilityOptions {
  /** Use display:none vs visibility:hidden? (default: true → display:none) */
  useDisplay?: boolean;
  /** Transition duration in ms (0 = instant) */
  transitionMs?: number;
  /** Callback when fully hidden/shown */
  onComplete?: () => void;
}

export interface CloneOptions {
  deep?: boolean;
  /** Clone event listeners? (uses workaround) */
  withEvents?: boolean;
  /** New ID prefix for cloned element */
  idPrefix?: string;
}

// --- Element Inspection ---

/**
 * Get comprehensive info about an element.
 */
export function getElementInfo(el: Element): ElementInfo {
  const cs = getComputedStyle(el);
  const attrs: Record<string, string> = {};
  const dataAttrs: Record<string, string> = {};
  const ariaAttrs: Record<string, string> = {};

  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i]!;
    if (attr.name.startsWith("data-")) {
      dataAttrs[attr.name.slice(5)] = attr.value;
    } else if (attr.name.startsWith("aria-")) {
      ariaAttrs[attr.name.slice(5)] = attr.value;
    } else {
      attrs[attr.name] = attr.value;
    }
  }

  const styles: Record<string, string> = {};
  // Only capture inline styles
  for (let i = 0; i < el.style.length; i++) {
    const prop = el.style[i]!;
    styles[prop] = el.style.getPropertyValue(prop);
  }

  return {
    tag: el.tagName.toLowerCase(),
    id: el.id,
    classes: el.className.split(/\s+/).filter(Boolean),
    attributes: attrs,
    dataAttributes: dataAttrs,
    ariaAttributes: ariaAttrs,
    styles,
    textContent: el.textContent ?? "",
    innerHTML: el.innerHTML,
    childCount: el.children.length,
    isVisible: cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0",
    isInDOM: document.body.contains(el),
  };
}

/** Check if an element has a specific CSS class */
export function hasClass(el: Element, className: string): boolean {
  return el.classList.contains(className);
}

/** Add one or more classes to an element */
export function addClasses(el: Element, ...classNames: string[]): void {
  el.classList.add(...classNames.filter(Boolean));
}

/** Remove one or more classes from an element */
export function removeClasses(el: Element, ...classNames: string[]): void {
  el.classList.remove(...classNames.filter(Boolean));
}

/** Toggle a class on an element */
export function toggleClass(el: Element, className: string, force?: boolean): boolean {
  if (force !== undefined) {
    el.classList.toggle(className, force);
    return force;
  }
  return el.classList.toggle(className);
}

/** Replace one class with another */
export function replaceClass(el: Element, oldClass: string, newClass: string): void {
  if (hasClass(el, oldClass)) {
    removeClasses(el, oldClass);
    addClasses(el, newClass);
  }
}

// --- Attribute Management ---

/** Safely get an attribute value */
export function getAttr(el: Element, name: string): string | null {
  return el.getAttribute(name);
}

/** Safely set an attribute value */
export function setAttr(el: Element, name: string, value: string | number | boolean): void {
  if (value === false || value === null) {
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, String(value));
  }
}

/** Check if an element has an attribute */
export function hasAttr(el: Element, name: string): boolean {
  return el.hasAttribute(name);
}

/** Remove an attribute */
export function removeAttr(el: Element, name: string): void {
  el.removeAttribute(name);
}

/** Toggle a boolean attribute (like disabled, checked) */
export function toggleAttr(el: Element, name: string, force?: boolean): void {
  if (force === undefined) force = !el.hasAttribute(name);
  if (force) {
    el.setAttribute(name, "");
  } else {
    el.removeAttribute(name);
  }
}

// --- Data Attributes ---

/** Get a data attribute value (parsed as JSON if possible) */
export function getData<T = string>(el: Element, key: string): T | null {
  const val = el.dataset[key];
  if (val === undefined) return null;
  try {
    return JSON.parse(val) as T;
  } catch {
    return val as unknown as T;
  }
}

/** Set a data attribute (auto-stringifies objects/arrays) */
export function setData(el: Element, key: string, value: unknown): void {
  if (typeof value === "object" && value !== null) {
    el.dataset[key] = JSON.stringify(value);
  } else {
    el.dataset[key] = String(value);
  }
}

/** Remove a data attribute */
export function removeData(el: Element, key: string): void {
  delete el.dataset[key];
}

/** Get all data attributes as a plain object */
export function getAllData(el: Element): Record<string, string> {
  return { ...el.dataset };
}

// --- ARIA Helpers ---

/** Set ARIA attributes conveniently */
export function setAria(el: Element, attrs: Partial<Record<string, string | boolean>>): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false) {
      el.removeAttribute(`aria-${key}`);
    } else {
      el.setAttribute(`aria-${key}`, String(value ?? ""));
    }
  }
}

/** Mark an element as busy/loading */
export function setBusy(el: Element, busy = true): void {
  setAria(el, { busy });
  toggleClass(el, "aria-busy", busy);
}

/** Set the accessible name of an element */
export function setAccessibleName(el: Element, name: string): void {
  if (el.getAttribute("role") || ["img", "figure"].includes(el.tagName.toLowerCase())) {
    setAria(el, { label: name });
  } else {
    el.setAttribute("aria-label", name);
  }
}

// --- Visibility Control ---

/** Hide an element */
export function hide(el: HTMLElement, opts: VisibilityOptions = {}): void {
  const useDisplay = opts.useDisplay !== false;

  if (opts.transitionMs && opts.transitionMs > 0) {
    el.style.transition = `opacity ${opts.transitionMs}ms ease`;
    el.style.opacity = "0";
    setTimeout(() => {
      if (useDisplay) {
        el.style.display = "none";
      } else {
        el.style.visibility = "hidden";
      }
      el.style.transition = "";
      opts.onComplete?.();
    }, opts.transitionMs);
  } else {
    if (useDisplay) {
      el.style.display = "none";
    } else {
      el.style.visibility = "hidden";
    }
    opts.onComplete?.();
  }
}

/** Show an element (reverses hide) */
export function show(el: HTMLElement, display = "block"): void {
  // If hidden via display:none
  if (getComputedStyle(el).display === "none") {
    el.style.display = display;
  }
  // If hidden via visibility:hidden
  if (getComputedStyle(el).visibility === "hidden") {
    el.style.visibility = "visible";
  }
  // If hidden via opacity:0
  if (getComputedStyle(el).opacity === "0") {
    el.style.opacity = "1";
  }
}

/** Toggle visibility */
export function toggleVisibility(el: HTMLElement, display = "block"): boolean {
  const isHidden = getComputedStyle(el).display === "none" ||
    getComputedStyle(el).visibility === "hidden";
  if (isHidden) {
    show(el, display);
  } else {
    hide(el);
  }
  return !isHidden;
}

/** Check if element is visually hidden (not in accessibility tree) */
export function isVisuallyHidden(el: Element): boolean {
  const cs = getComputedStyle(el);
  return cs.display === "none" ||
    cs.visibility === "hidden" ||
    (parseFloat(cs.opacity) === 0 && cs.pointerEvents === "none");
}

/** Apply sr-only (screen-reader only) styling */
export function screenReaderOnly(el: HTMLElement): void {
  Object.assign(el.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: "0",
  });
}

// --- Element Cloning ---

/** Deep clone an element with optional modifications */
export function cloneElement(el: Element, opts: CloneOptions = {}): Element {
  const cloned = el.cloneNode(opts.deep !== false) as Element;

  if (opts.idPrefix && cloned.id) {
    cloned.id = `${opts.idPrefix}${cloned.id}`;
  }

  // Update IDs of cloned children
  if (opts.idPrefix) {
    const allWithId = cloned.querySelectorAll("[id]");
    for (const child of allWithId) {
      child.id = `${opts.idPrefix}${child.id}`;
    }
  }

  return cloned;
}

/** Clone an element and insert it after the original */
export function duplicateAfter(el: Element): Element {
  const clone = cloneElement(el, { deep: true });
  el.parentNode?.insertBefore(clone, el.nextSibling);
  return clone;
}

// --- State Management ---

/** Store arbitrary state on an element using WeakMap */
const elementState = new WeakMap<Element, Map<string, unknown>>();

/** Set state on an element */
export function setState(el: Element, key: string, value: unknown): void {
  if (!elementState.has(el)) {
    elementState.set(el, new Map());
  }
  elementState.get(el)!.set(key, value);
}

/** Get state from an element */
export function getState<T = unknown>(el: Element, key: string): T | undefined {
  return elementState.get(el)?.get(key) as T | undefined;
}

/** Remove state from an element */
export function removeState(el: Element, key: string): void {
  elementState.get(el)?.delete(key);
}

/** Clear all state for an element */
export function clearState(el: Element): void {
  elementState.delete(el);
}

// --- Misc ---

/** Check if an element is scrollable */
export function isScrollable(el: HTMLElement): boolean {
  const cs = getComputedStyle(el);
  return (
    (cs.overflow === "auto" || cs.overflow === "scroll" ||
     cs.overflowY === "auto" || cs.overflowY === "scroll" ||
     cs.overflowX === "auto" || cs.overflowX === "scroll") &&
    (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)
  );
}

/** Make an element inert (non-interactive) */
export function makeInert(el: HTMLElement, inert = true): void {
  el.inert = inert;
}

/** Disable an element visually and functionally */
export function disable(el: HTMLElement, reason?: string): void {
  (el as HTMLButtonElement & HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement).disabled = true;
  setAria(el, { disabled: "true" });
  if (reason) setData(el, "disable-reason", reason);
}

/** Enable a previously disabled element */
export function enable(el: HTMLElement): void {
  (el as HTMLButtonElement & HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement).disabled = false;
  removeAttr(el, "aria-disabled");
  removeData(el, "disable-reason");
}

/** Scroll to top of an element smoothly */
export function scrollToTop(el: HTMLElement, behavior: ScrollBehavior = "smooth"): void {
  el.scrollTo({ top: 0, behavior });
}

/** Scroll to bottom of an element smoothly */
export function scrollToBottom(el: HTMLElement, behavior: ScrollBehavior = "smooth"): void {
  el.scrollTo({ top: el.scrollHeight, behavior });
}
