/**
 * Detect React component boundaries in the DOM.
 * Uses React's internal __reactFiber$ keys to trace component names.
 * Falls back to DOM element info for non-React pages.
 */

interface DetectedComponent {
  name: string
  element: HTMLElement
  fiber: unknown
}

/**
 * Find the React fiber key for a given DOM element.
 * Supports React 16+ (both __reactFiber$ and __reactInternalInstance$).
 */
function getFiber(element: HTMLElement): unknown | null {
  // Try all known React internal keys
  const keys = Object.keys(element).filter(
    (k) =>
      k.startsWith("__reactFiber$") ||
      k.startsWith("__reactInternalInstance$")
  )
  if (keys.length === 0) return null

  return (element as Record<string, unknown>)[keys[0]]
}

/**
 * Walk up the fiber tree to find the nearest component with a displayName.
 * Also checks for memo/wrapped components (ForwardRef, Memo, etc.)
 */
function getComponentName(fiber: unknown): string | null {
  let current: any = fiber
  let depth = 0
  const MAX_DEPTH = 30 // Prevent infinite loops in corrupted fiber trees

  while (current && depth < MAX_DEPTH) {
    depth++

    // Check direct type
    if (current.type) {
      const type = current.type

      // Function/class component with displayName
      if (typeof type === "function" && type.displayName) {
        return type.displayName
      }

      // ForwardRef: check render function
      if (type.$$typeof && typeof type.render === "function" && type.render.displayName) {
        return type.render.displayName
      }

      // Memo wrapper: unwrap and check inner type
      if (type.$$typeof === Symbol.for("react.memo") && type.type?.displayName) {
        return type.type.displayName
      }

      // String type = HTML element (div, span, etc.) — skip
      if (typeof type === "string") {
        // Skip host elements
      }
    }

    // Try _debugOwner or return for walking up
    current = current.return || current._debugOwner
  }

  return null
}

/**
 * Given a DOM element, find the React component it belongs to.
 */
export function detectReactComponent(element: HTMLElement): DetectedComponent | null {
  const fiber = getFiber(element)
  if (!fiber) return null

  const name = getComponentName(fiber)
  if (!name) return null

  return { name, element, fiber }
}

/**
 * Build a fallback name from DOM element info when React detection fails.
 */
function buildFallbackName(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase()
  const parts: string[] = [tag]

  // Add ID if present
  if (element.id) {
    parts.push(`#${element.id}`)
  }

  // Add up to 2 class names
  if (element.className && typeof element.className === "string") {
    const classes = element.className
      .split(/\s+/)
      .filter((c) => c.length > 0 && !c.match(/^(uac-|plasmo-)/))
      .slice(0, 2)
    if (classes.length > 0) {
      parts.push(`.${classes.join(".")}`)
    }
  }

  // Add data attributes if present
  const dataAttrs = Array.from(element.attributes)
    .filter((a) => a.name.startsWith("data-") && a.name !== "data-testid")
    .slice(0, 1)
    .map((a) => `[${a.name}]`)
  if (dataAttrs.length > 0) {
    parts.push(dataAttrs[0])
  }

  return parts.join("") || "element"
}

/**
 * Walk up the DOM from a given element to find the closest React component.
 * Falls back to DOM-based identification if no React fiber is found.
 */
export function findNearestComponent(target: HTMLElement): DetectedComponent | null {
  let current: HTMLElement | null = target
  let triedFallback = false

  while (current && current !== document.body) {
    const component = detectReactComponent(current)
    if (component) return component
    current = current.parentElement
  }

  // No React component found anywhere in the tree
  // Return a fallback based on the original target
  if (!triedFallback && target && target !== document.body) {
    const fallbackName = buildFallbackName(target)
    return {
      name: fallbackName,
      element: target,
      fiber: null,
    }
  }

  return null
}
