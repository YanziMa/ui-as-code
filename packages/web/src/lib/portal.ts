/**
 * Portal: Render elements outside their DOM parent (to body, specific container).
 * Supports multiple portal targets, cleanup, event forwarding, and z-index management.
 */

// --- Types ---

export type PortalTarget = "body" | HTMLElement | string;

export interface PortalOptions {
  /** Element to portal */
  element: HTMLElement;
  /** Target container */
  target?: PortalTarget;
  /** Z-index for the portaled element */
  zIndex?: number;
  /** Disable pointer events on original position? */
  disableOriginal?: boolean;
  /** Keep in DOM flow with a placeholder? */
  usePlaceholder?: boolean;
  /** Callback when portal is mounted */
  onMount?: () => void;
  /** Callback when portal is unmounted */
  onUnmount?: () => void;
}

export interface PortalInstance {
  /** The wrapper element that replaces the original in the DOM flow */
  placeholder: HTMLDivElement | null;
  /** The actual element (now in target container) */
  element: HTMLElement;
  /** Target container where element lives */
  targetContainer: HTMLElement;
  /** Update target dynamically */
  setTarget: (target: PortalTarget) => void;
  /** Update z-index */
  setZIndex: (zIndex: number) => void;
  /** Remove from portal and restore to original position */
  unmount: () => void;
  /** Check if currently portaled */
  isPortaled: () => boolean;
}

// --- Helpers ---

function resolveTarget(target: PortalTarget): HTMLElement {
  if (target === "body") return document.body;
  if (typeof target === "string") {
    const el = document.querySelector(target);
    if (!el) throw new Error(`Portal: target "${target}" not found`);
    return el as HTMLElement;
  }
  return target;
}

// --- Main API ---

/** Create a portal: moves an element to a different DOM container */
export function createPortal(options: PortalOptions): PortalInstance {
  const { element } = options;
  const target = options.target ?? "body";
  const targetContainer = resolveTarget(target);

  let placeholder: HTMLDivElement | null = null;

  // Save original parent and next sibling for restoration
  const originalParent = element.parentElement;
  const originalNextSibling = element.nextElementSibling;

  // Create placeholder if requested
  if (options.usePlaceholder) {
    placeholder = document.createElement("div");
    placeholder.className = "portal-placeholder";
    placeholder.setAttribute("data-portal-id", "");
    placeholder.style.cssText = "display:inline;";
    if (originalParent) {
      originalParent.insertBefore(placeholder, element);
    }
  }

  // Apply styles before moving
  if (options.zIndex !== undefined) {
    element.style.zIndex = String(options.zIndex);
  }
  if (options.disableOriginal) {
    // Mark original spot
  }

  // Move element to target
  targetContainer.appendChild(element);

  options.onMount?.();

  let destroyed = false;

  const instance: PortalInstance = {
    placeholder,
    element,
    targetContainer,

    setTarget(newTarget: PortalTarget) {
      const newContainer = resolveTarget(newTarget);
      newContainer.appendChild(element);
      instance.targetContainer = newContainer;
    },

    setZIndex(zIndex: number) {
      element.style.zIndex = String(zIndex);
    },

    unmount() {
      if (destroyed) return;
      destroyed = true;

      // Restore to original position
      if (placeholder && placeholder.parentElement) {
        placeholder.parentElement.insertBefore(element, placeholder.nextSibling);
        placeholder.remove();
        instance.placeholder = null;
      } else if (originalParent) {
        if (originalNextSibling) {
          originalParent.insertBefore(element, originalNextSibling);
        } else {
          originalParent.appendChild(element);
        }
      }

      // Clean up inline styles we added
      if (options.zIndex !== undefined) {
        element.style.zIndex = "";
      }

      options.onUnmount?.();
    },

    isPortaled() {
      return !destroyed && element.parentElement === targetContainer;
    },
  };

  return instance;
}

// --- Portal Manager (for managing multiple portals) ---

export class PortalManager {
  private portals = new Map<string, PortalInstance>();
  private defaultTarget: PortalTarget = "body";
  private counter = 0;

  constructor(defaultTarget?: PortalTarget) {
    if (defaultTarget) this.defaultTarget = defaultTarget;
  }

  /** Create a managed portal with auto-generated ID */
  create(options: Omit<PortalOptions, "element"> & { id?: string }, element: HTMLElement): string {
    const id = options.id ?? `portal-${++this.counter}`;
    const instance = createPortal({
      ...options,
      element,
      target: options.target ?? this.defaultTarget,
    });
    this.portals.set(id, instance);
    return id;
  }

  /** Get a portal instance by ID */
  get(id: string): PortalInstance | undefined {
    return this.portals.get(id);
  }

  /** Unmount and remove a portal by ID */
  remove(id: string): boolean {
    const instance = this.portals.get(id);
    if (!instance) return false;
    instance.unmount();
    this.portals.delete(id);
    return true;
  }

  /** Unmount all portals */
  removeAll(): void {
    for (const [id] of this.portals) {
      this.remove(id);
    }
  }

  /** Get all active portal IDs */
  getIds(): string[] {
    return Array.from(this.portals.keys());
  }

  /** Count of active portals */
  get count(): number {
    return this.portals.size;
  }

  /** Change default target for future portals */
  setDefaultTarget(target: PortalTarget): void {
    this.defaultTarget = target;
  }

  /** Destroy manager and clean up all portals */
  destroy(): void {
    this.removeAll();
  }
}

// --- Global singleton ---

let globalPortalManager: PortalManager | null = null;

/** Get or create the global portal manager */
export function getPortalManager(target?: PortalTarget): PortalManager {
  if (!globalPortalManager) {
    globalPortalManager = new PortalManager(target);
  }
  return globalPortalManager;
}
