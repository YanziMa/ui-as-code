/**
 * Detect React component boundaries in the DOM.
 * Uses React's internal __reactFiber$ keys to trace component names.
 */

interface DetectedComponent {
  name: string
  element: HTMLElement
  fiber: unknown
}

/**
 * Find the React fiber for a given DOM element.
 */
function getFiber(element: HTMLElement): unknown | null {
  const key = Object.keys(element).find(
    (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$")
  )
  return key ? (element as Record<string, unknown>)[key] : null
}

/**
 * Walk up the fiber tree to find the nearest component with a displayName.
 */
function getComponentName(fiber: unknown): string | null {
  let current = fiber
  while (current) {
    const f = current as Record<string, unknown>
    if (f.type && typeof f.type === "function" && (f.type as Record<string, unknown>).displayName) {
      return (f.type as Record<string, unknown>).displayName as string
    }
    if (f.type && typeof f.type === "string") {
      // HTML element like "div", "span" — skip
    }
    current = f.return as unknown
  }
  return null
}

/**
 * Given a DOM element, find the nearest React component boundary.
 */
export function detectReactComponent(element: HTMLElement): DetectedComponent | null {
  const fiber = getFiber(element)
  if (!fiber) return null

  const name = getComponentName(fiber)
  if (!name) return null

  return { name, element, fiber }
}

/**
 * Walk up the DOM from a given element to find the closest React component.
 */
export function findNearestComponent(target: HTMLElement): DetectedComponent | null {
  let current: HTMLElement | null = target
  while (current) {
    const component = detectReactComponent(current)
    if (component) return component
    current = current.parentElement
  }
  return null
}
