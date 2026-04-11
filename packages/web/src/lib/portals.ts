/**
 * Portal System: Render DOM elements outside their component hierarchy
 * into designated container targets (modals, tooltips, dropdowns, etc.).
 * Supports multiple portal targets, z-index management, teleport animations,
 * cleanup on unmount, and React-like portal API for vanilla JS.
 */

// --- Types ---

export interface PortalOptions {
  /** Content to render inside the portal */
  content: HTMLElement | string;
  /** Target container (default: document.body) */
  target?: HTMLElement | string;
  /** Unique identifier for this portal */
  id?: string;
  /** CSS class for the portal wrapper */
  className?: string;
  /** Inline styles for the wrapper */
  style?: Partial<CSSStyleDeclaration>;
  /** Z-index for the portal wrapper */
  zIndex?: number;
  /** Append to target instead of replacing? */
  append?: boolean;
  /** Callback when portal is mounted */
  onMount?: (wrapper: HTMLElement) => void;
  /** Callback before portal unmounts */
  onUnmount?: (wrapper: HTMLElement) => void;
  /** Animation on mount? */
  animateIn?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
}

export interface PortalInstance {
  /** The portal wrapper element */
  element: HTMLElement;
  /** Update content dynamically */
  update: (content: HTMLElement | string) => void;
  /** Move to a different target */
  moveTarget: (target: HTMLElement | string) => void;
  /** Show (if hidden) */
  show: () => void;
  /** Hide (without destroying) */
  hide: () => void;
  /** Check visibility */
  isVisible: () => boolean;
  /** Destroy and remove from DOM */
  destroy: () => void;
}

export interface PortalManagerOptions {
  /** Default target for portals without explicit target */
  defaultTarget?: HTMLElement | string;
  /** Auto-incrementing z-index base */
  zIndexBase?: number;
  /** Default animation settings */
  animateByDefault?: boolean;
  /** Default animation duration */
  defaultAnimationDuration?: number;
  /** Track all created portals */
  trackPortals?: boolean;
}

export interface PortalManagerInstance {
  /** Create a new portal */
  create: (options: PortalOptions) => PortalInstance;
  /** Get a portal by ID */
  get: (id: string) => PortalInstance | undefined;
  /** Get all active portals */
  getAll: () => PortalInstance[];
  /** Destroy all portals */
  destroyAll: () => void;
  /** Create or reuse a named portal target container */
  ensureTarget: (name: string, options?: { className?: string; style?: Partial<CSSStyleDeclaration> }) => HTMLElement;
  /** Set default z-index base */
  setZIndexBase: (base: number) => void;
}

// --- Named Target Registry ---

const namedTargets = new Map<string, HTMLElement>();

/** Ensure a named target container exists in the DOM */
export function getOrCreateTarget(
  name: string,
  options?: { className?: string; style?: Partial<CSSStyleDeclaration> },
): HTMLElement {
  if (namedTargets.has(name)) return namedTargets.get(name)!;

  const el = document.createElement("div");
  el.id = `portal-target-${name}`;
  el.className = `portal-target ${options?.className ?? ""}`;
  el.setAttribute("data-portal-target", name);
  el.style.cssText = `
    position:fixed;inset:0;pointer-events:none;z-index:0;
    ${options?.style ? Object.entries(options.style).map(([k, v]) => `${k}:${v}`).join(";") : ""}
  `;
  document.body.appendChild(el);
  namedTargets.set(name, el);
  return el;
}

// --- Main Factory ---

export function createPortal(options: PortalOptions): PortalInstance {
  const counter = typeof globalThis !== "undefined" ? (globalThis as Record<string, number>).__portalCounter ?? 0 : 0;

  // Resolve target
  function resolveTarget(): HTMLElement {
    const raw = options.target ?? "body";
    if (typeof raw === "string") {
      if (raw === "body") return document.body;
      const named = namedTargets.get(raw);
      if (named) return named;
      return document.querySelector<HTMLElement>(raw) ?? document.body;
    }
    return raw;
  }

  const target = resolveTarget();
  let visible = true;
  let destroyed = false;

  // Create wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `portal-wrapper ${options.className ?? ""}`;
  wrapper.dataset.portalId = options.id ?? `portal-${counter}`;

  if (options.zIndex !== undefined) {
    wrapper.style.zIndex = String(options.zIndex);
  }
  if (options.style) {
    Object.assign(wrapper.style, options.style);
  }
  wrapper.style.pointerEvents = "auto";
  wrapper.style.position = "relative";

  // Set content
  function setContent(content: HTMLElement | string): void {
    wrapper.innerHTML = "";
    if (typeof content === "string") {
      wrapper.innerHTML = content;
    } else {
      wrapper.appendChild(content);
    }
  }

  setContent(options.content);

  // Mount to target
  if (options.append) {
    target.appendChild(wrapper);
  } else {
    target.insertBefore(wrapper, target.firstChild);
  }

  // Animate in
  if (options.animateIn !== false && options.animationDuration !== 0) {
    const dur = options.animationDuration ?? 200;
    wrapper.style.opacity = "0";
    wrapper.style.transform = "scale(0.97)";
    requestAnimationFrame(() => {
      wrapper.style.transition = `opacity ${dur}ms ease, transform ${dur}ms ease`;
      wrapper.style.opacity = "1";
      wrapper.style.transform = "scale(1)";
    });
  }

  options.onMount?.(wrapper);

  const instance: PortalInstance = {
    element: wrapper,

    update(content: HTMLElement | string) {
      setContent(content);
    },

    moveTarget(newTarget: HTMLElement | string) {
      const resolved = typeof newTarget === "string"
        ? (newTarget === "body" ? document.body : document.querySelector<HTMLElement>(newTarget) ?? document.body)
        : newTarget;
      resolved.appendChild(wrapper);
    },

    show() {
      if (destroyed || visible) return;
      visible = true;
      wrapper.style.display = "";

      if (options.animateIn !== false) {
        const dur = options.animationDuration ?? 200;
        wrapper.style.transition = `opacity ${dur}ms ease`;
        wrapper.style.opacity = "0";
        requestAnimationFrame(() => { wrapper.style.opacity = "1"; });
      }
    },

    hide() {
      if (destroyed || !visible) return;
      visible = false;
      const dur = options.animationDuration ?? 200;
      wrapper.style.transition = `opacity ${dur}ms ease`;
      wrapper.style.opacity = "0";
      setTimeout(() => {
        if (!visible) wrapper.style.display = "none";
      }, dur);
    },

    isVisible: () => visible,

    destroy() {
      if (destroyed) return;
      destroyed = true;
      visible = false;
      options.onUnmount?.(wrapper);
      wrapper.remove();
    },
  };

  return instance;
}

// --- Portal Manager (multi-portal orchestrator) ---

export function createPortalManager(options: PortalManagerOptions = {}): PortalManagerInstance {
  const opts = {
    defaultTarget: options.defaultTarget ?? "body",
    zIndexBase: options.zIndexBase ?? 1000,
    animateByDefault: options.animateByDefault ?? false,
    defaultAnimationDuration: options.defaultAnimationDuration ?? 200,
    ...options,
  };

  const portals = new Map<string, PortalInstance>();
  let nextZIndex = opts.zIndexBase;

  const manager: PortalManagerInstance = {
    create(portalOpts: PortalOptions): PortalInstance {
      const id = portalOpts.id ?? `portal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const instance = createPortal({
        ...portalOpts,
        id,
        target: portalOpts.target ?? opts.defaultTarget,
        animateIn: portalOpts.animateIn ?? opts.animateByDefault,
        animationDuration: portalOpts.animationDuration ?? opts.defaultAnimationDuration,
        zIndex: portalOpts.zIndex ?? nextZIndex++,
      });

      if (opts.trackPortals) {
        portals.set(id, instance);
      }

      return instance;
    },

    get(id: string): PortalInstance | undefined {
      return portals.get(id);
    },

    getAll(): PortalInstance[] {
      return Array.from(portals.values());
    },

    destroyAll() {
      for (const [, portal] of portals) {
        portal.destroy();
      }
      portals.clear();
    },

    ensureTarget(name: string, targetOpts?: { className?: string; style?: Partial<CSSStyleDeclaration> }): HTMLElement {
      return getOrCreateTarget(name, targetOpts);
    },

    setZIndexBase(base: number) {
      nextZIndex = base;
    },
  };

  return manager;
}

// --- Convenience: Common Portal Targets ---

/** Create a modal portal target (high z-index, centered) */
export function createModalTarget(): HTMLElement {
  return getOrCreateTarget("modal", {
    className: "portal-modal-target",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "auto",
    } as Partial<CSSStyleDeclaration>,
  });
}

/** Create a tooltip/popover portal target (above everything) */
export function createTooltipTarget(): HTMLElement {
  return getOrCreateTarget("tooltip", {
    className: "portal-tooltip-target",
    style: {
      pointerEvents: "none",
      zIndex: "2147483647", // max z-index
    } as Partial<CSSStyleDeclaration>,
  });
}

/** Create a notification/toast portal target (top-right corner) */
export function createNotificationTarget(): HTMLElement {
  return getOrCreateTarget("notification", {
    className: "portal-notification-target",
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      padding: "16px",
      gap: "8px",
      pointerEvents: "auto",
      zIndex: "2147483646",
    } as Partial<CSSStyleDeclaration>,
  });
}

/** Create a drawer/overlay portal target */
export function createDrawerTarget(): HTMLElement {
  return getOrCreateTarget("drawer", {
    className: "portal-drawer-target",
    style: {
      pointerEvents: "auto",
      zIndex: "2147483645",
    } as Partial<CSSStyleDeclaration>,
  });
}
