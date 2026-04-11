/**
 * Portal Utilities: Render elements into a different part of the DOM tree
 * (teleportation), with container management, z-index stacking,
 * event forwarding, cleanup, and multiple portal support.
 */

// --- Types ---

export type PortalContainerType = "body" | "custom";

export interface PortalOptions {
  /** Content to render in the portal */
  content: HTMLElement | string;
  /** Where to mount ("body" or custom element) */
  container?: HTMLElement | "body";
  /** CSS class for the portal wrapper */
  className?: string;
  /** Inline styles for the portal wrapper */
  style?: Partial<CSSStyleDeclaration>;
  /** Z-index of the portal wrapper */
  zIndex?: number;
  /** Disable pointer events on portal overlay? */
  disablePointerEvents?: boolean;
  /** Called when portal is mounted */
  onMount?: (portalEl: HTMLElement) => void;
  /** Called when portal is unmounted */
  onUnmount?: () => void;
}

export interface PortalInstance {
  /** The portal wrapper element */
  el: HTMLElement;
  /** The content element inside portal */
  contentEl: HTMLElement;
  /** Mount the portal into the DOM */
  mount(): void;
  /** Unmount the portal from the DOM */
  unmount(): void;
  /** Check if currently mounted */
  isMounted(): boolean;
  /** Update content dynamically */
  setContent(content: HTMLElement | string): void;
  /** Update portal styles */
  updateStyle(style: Partial<CSSStyleDeclaration>): void;
  /** Destroy and cleanup completely */
  destroy(): void;
}

export interface PortalManagerConfig {
  /** Default container for portals */
  defaultContainer?: HTMLElement | "body";
  /** Default z-index base */
  zIndexBase?: number;
  /** Auto-increment z-index for each portal? */
  stackZIndex?: boolean;
}

export interface PortalManagerInstance {
  /** Create a new portal */
  create(options: PortalOptions): PortalInstance;
  /** Get all active portals */
  getPortals(): PortalInstance[];
  /** Close/unmount all portals */
  closeAll(): void;
  /** Destroy manager and all portals */
  destroy(): void;
}

// --- Core Factory ---

/**
 * Create a portal that renders content elsewhere in the DOM.
 *
 * @example
 * ```ts
 * const portal = createPortal({
 *   content: modalContent,
 *   container: document.body,
 *   className: "modal-portal",
 *   zIndex: 1050,
 * });
 * portal.mount();
 * // Later: portal.unmount();
 * ```
 */
export function createPortal(options: PortalOptions): PortalInstance {
  const {
    content,
    container: containerEl = "body",
    className,
    style,
    zIndex = 1050,
    disablePointerEvents = false,
    onMount,
    onUnmount,
  } = options;

  let _mounted = false;

  // Create wrapper
  const el = document.createElement("div");
  el.className = `portal ${className ?? ""}`.trim();
  el.setAttribute("data-portal", "true");
  el.style.cssText =
    "position:fixed;top:0;left:0;" +
    `z-index:${zIndex};` +
    (disablePointerEvents ? "pointer-events:none;" : "") +
    "display:none;"; // Hidden until mounted

  // Create content element
  let contentEl: HTMLElement;
  if (typeof content === "string") {
    contentEl = document.createElement("div");
    contentEl.innerHTML = content;
  } else {
    contentEl = content.cloneNode(true) as HTMLElement;
  }

  el.appendChild(contentEl);

  // Apply custom styles
  if (style) {
    Object.assign(el.style, style);
  }

  function mount(): void {
    if (_mounted) return;
    _mounted = true;

    const target = containerEl === "body"
      ? document.body
      : containerEl as HTMLElement;
    target.appendChild(el);
    el.style.display = "";

    onMount?.(el);
  }

  function unmount(): void {
    if (!_mounted) return;
    _mounted = false;
    el.style.display = "none";
    el.remove();
    onUnmount?.();
  }

  function isMounted(): boolean { return _mounted; }

  function setContent(newContent: HTMLElement | string): void {
    if (typeof newContent === "string") {
      contentEl.innerHTML = newContent;
    } else {
      contentEl.innerHTML = "";
      contentEl.appendChild(newContent.cloneNode(true));
    }
  }

  function updateStyle(newStyle: Partial<CSSStyleDeclaration>): void {
    Object.assign(el.style, newStyle);
  }

  function destroy(): void {
    unmount();
  }

  return { el, contentEl, mount, unmount, isMounted, setContent, updateStyle, destroy };
}

// --- Portal Manager ---

/**
 * Create a portal manager for managing multiple portals.
 *
 * @example
 * ```ts
 * const manager = createPortalManager({ zIndexBase: 1000, stackZIndex: true });
 * const p1 = manager.create({ content: dropdown1 });
 * const p2 = manager.create({ content: modal1 });
 * p1.mount();
 * p2.mount();
 * // Later: manager.closeAll();
 * ```
 */
export function createPortalManager(config: PortalManagerConfig = {}): PortalManagerInstance {
  const {
    defaultContainer = "body",
    zIndexBase = 1000,
    stackZIndex = true,
  } = config;

  const portals: PortalInstance[] = [];
  let _nextZIndex = zIndexBase;

  function create(options: PortalOptions): PortalInstance {
    const portal = createPortal({
      ...options,
      container: options.container ?? defaultContainer,
      zIndex: stackZIndex ? _nextZIndex++ : (options.zIndex ?? zIndexBase),
    });

    portals.push(portal);
    return portal;
  }

  function getPortals(): PortalInstance[] { return [...portals]; }

  function closeAll(): void {
    for (const p of portals) p.unmount();
  }

  function destroy(): void {
    closeAll();
    portals.length = 0;
  }

  return { create, getPortals, closeAll, destroy };
}
