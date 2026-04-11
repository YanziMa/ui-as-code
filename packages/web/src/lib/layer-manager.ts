/**
 * Layer Manager: Z-index stacking context manager for overlays, modals,
 * toasts, dropdowns, and other layered UI elements.
 *
 * Provides:
 *   - Named layer registry with z-index ordering
 *   - Layer creation, activation, deactivation
 *   - Stack management (push/pop/top)
 *   - Escape key handling for dismissible layers
 *   - Click-outside detection
 *   - Focus trapping within active layers
 *   - Layer transition animations
 *   - Modal-like backdrop management
 */

// --- Types ---

export type LayerId = string;

export interface LayerOptions {
  /** Unique layer identifier */
  id: LayerId;
  /** Content element or factory function */
  content: HTMLElement | (() => HTMLElement);
  /** Z-index (auto-assigned if not specified) */
  zIndex?: number;
  /** Whether layer blocks interaction with layers below */
  modal?: boolean;
  /** Whether clicking backdrop dismisses the layer */
  dismissOnBackdrop?: boolean;
  /** Whether pressing Escape dismisses the layer */
  dismissOnEscape?: boolean;
  /** Container element (default: document.body) */
  container?: HTMLElement | string;
  /** Animation on enter */
  enterAnimation?: (el: HTMLElement) => void;
  /** Animation on exit */
  exitAnimation?: (el: HTMLElement) => Promise<void>;
  /** Callback when layer is activated */
  onActivate?: () => void;
  /** Callback when layer is deactivated */
  onDeactivate?: () => void;
  /** Callback before layer is destroyed */
  onDestroy?: () => void;
  /** Trap focus within this layer */
  trapFocus?: boolean;
  /** Initial visibility state */
  visible?: boolean;
  /** CSS class for the wrapper */
  className?: string;
}

export interface LayerInstance {
  /** Layer ID */
  id: LayerId;
  /** The content element */
  element: HTMLElement;
  /** The wrapper element */
  wrapper: HTMLElement;
  /** Current z-index */
  zIndex: number;
  /** Whether currently visible/active */
  isActive: () => boolean;
  /** Show/activate the layer */
  activate: () => Promise<void>;
  /** Hide/deactivate the layer */
  deactivate: () => Promise<void>;
  /** Bring to front of stack */
  bringToFront: () => void;
  /** Send to back of stack */
  sendToBack: () => void;
  /** Set z-index explicitly */
  setZIndex: (z: number) => void;
  /** Destroy and remove from manager */
  destroy: () => Promise<void>;
}

export interface LayerManagerConfig {
  /** Base z-index for the bottom layer (default: 1000) */
  baseZIndex?: number;
  /** Z-index increment between layers (default: 10) */
  zIndexStep?: number;
  /** Default container for layers */
  defaultContainer?: HTMLElement | string;
  /** Global escape handler enabled (default: true) */
  handleEscape?: boolean;
  /** Default dismiss-on-backdrop behavior */
  dismissOnBackdropDefault?: boolean;
  /** Maximum layers allowed (default: Infinity) */
  maxLayers?: number;
}

export interface LayerManager {
  /** Create and register a new layer */
  createLayer: (options: LayerOptions) => LayerInstance;
  /** Get a layer by ID */
  getLayer: (id: LayerId) => LayerInstance | undefined;
  /** Get the topmost (active) layer */
  getTopLayer: () => LayerInstance | undefined;
  /** Get all layers ordered by z-index */
  getLayers: () => LayerInstance[];
  /** Get the current stack (top to bottom) */
  getStack: () -> LayerInstance[];
  /** Destroy all layers */
  destroyAll: () => Promise<void>;
  /** Get manager config info */
  getInfo: () => { baseZIndex: number; step: number; count: number };
}

// --- Built-in Animations ---

const fadeIn = (el: HTMLElement): void => {
  el.style.opacity = "0";
  el.style.transition = "opacity 0.15s ease-out";
  requestAnimationFrame(() => { el.style.opacity = "1"; });
};

const fadeOut = (el: HTMLElement): Promise<void> => new Promise((resolve) => {
  el.style.transition = "opacity 0.15s ease-in";
  el.style.opacity = "0";
  setTimeout(resolve, 150);
});

const slideUpIn = (el: HTMLElement): void => {
  el.style.transform = "translateY(10px)";
  el.style.opacity = "0";
  el.style.transition = "transform 0.2s ease-out, opacity 0.2s ease-out";
  requestAnimationFrame(() => { el.style.transform = "translateY(0)"; el.style.opacity = "1"; });
};

const slideUpOut = (el: HTMLElement): Promise<void> => new Promise((resolve) => {
  el.style.transition = "transform 0.2s ease-in, opacity 0.2s ease-in";
  el.style.transform = "translateY(-10px)";
  el.style.opacity = "0";
  setTimeout(resolve, 200);
});

export const layerAnimations = { fadeIn, fadeOut, slideUpIn, slideUpOut };

// --- Main Factory ---

export function createLayerManager(config: LayerManagerConfig = {}): LayerManager {
  const {
    baseZIndex = 1000,
    zIndexStep = 10,
    handleEscape = true,
    maxLayers = Infinity,
  } = config;

  const layers: Map<LayerId, LayerInstance> = new Map();
  let nextZIndex = baseZIndex;

  // --- Escape Handler ---

  if (handleEscape) {
    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const top = getTopLayer();
      if (top && (getLayerOptions(top.id)?.dismissOnEscape ?? false)) {
        e.preventDefault();
        top.deactivate();
      }
    });
  }

  // Store options for each layer (internal)
  const layerOptionsMap = new Map<LayerId, LayerOptions>();

  function getLayerOptions(id: LayerId): LayerOptions | undefined {
    return layerOptionsMap.get(id);
  }

  // --- Layer Creation ---

  function createLayer(options: LayerOptions): LayerInstance {
    if (layers.size >= maxLayers) {
      throw new Error(`LayerManager: maximum layers (${maxLayers}) reached`);
    }

    if (layers.has(options.id)) {
      throw new Error(`LayerManager: layer "${options.id}" already exists`);
    }

    layerOptionsMap.set(options.id, options);

    const containerEl = resolveContainer(options.container ?? config.defaultContainer);
    const zIndex = options.zIndex ?? nextZIndex;
    nextZIndex += zIndexStep;

    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.className = `layer-wrapper ${options.className ?? ""}`;
    wrapper.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;z-index:${zIndex};
      display:flex;align-items:center;justify-content:center;pointer-events:none;
    `;

    // Create content
    const content = typeof options.content === "function" ? options.content() : options.content;

    // Backdrop for modal layers
    let backdrop: HTMLElement | null = null;
    if (options.modal) {
      backdrop = document.createElement("div");
      backdrop.className = "layer-backdrop";
      backdrop.style.cssText = `
        position:absolute;inset:0;background:rgba(0,0,0,0.4);pointer-events:auto;
        transition:opacity 0.15s;
      `;
      if (options.dismissOnBackdrop ?? config.dismissOnBackdropDefault ?? false) {
        backdrop.addEventListener("click", () => {
          const instance = layers.get(options.id)!;
          if (instance.isActive()) instance.deactivate();
        });
      }
      wrapper.appendChild(backdrop);
    }

    // Content wrapper with pointer events
    const contentWrapper = document.createElement("div");
    contentWrapper.style.cssText = "position:relative;pointer-events:auto;";
    contentWrapper.appendChild(content);
    wrapper.appendChild(contentWrapper);

    containerEl.appendChild(wrapper);

    // Initially hidden unless visible=true
    if (!options.visible) {
      wrapper.style.display = "none";
      wrapper.style.pointerEvents = "none";
    }

    const instance: LayerInstance = {
      id: options.id,
      element: content,
      wrapper,
      zIndex,

      isActive: () => wrapper.style.display !== "none",

      async activate() {
        if (this.isActive()) return;
        wrapper.style.display = "";
        wrapper.style.pointerEvents = "";

        // Bring to front
        this.bringToFront();

        // Run enter animation
        const anim = options.enterAnimation ?? fadeIn;
        anim(contentWrapper);

        if (options.trapFocus) trapFocusWithin(contentWrapper);

        options.onActivate?.();
      },

      async deactivate() {
        if (!this.isActive()) return;

        const anim = options.exitAnimation ?? fadeOut;
        await anim(contentWrapper);

        wrapper.style.display = "none";
        wrapper.style.pointerEvents = "none";

        options.onDeactivate?.();
      },

      bringToFront() {
        nextZIndex += zIndexStep;
        this.zIndex = nextZIndex;
        wrapper.style.zIndex = String(nextZIndex);
      },

      sendToBack() {
        this.zIndex = baseZIndex;
        wrapper.style.zIndex = String(baseZIndex);
      },

      setZIndex(z: number) {
        this.zIndex = z;
        wrapper.style.zIndex = String(z);
      },

      async destroy() {
        options.onDestroy?.();
        wrapper.remove();
        layers.delete(options.id);
        layerOptionsMap.delete(options.id);
      },
    };

    layers.set(options.id, instance);
    return instance;
  }

  // --- Query Methods ---

  function getLayer(id: LayerId): LayerInstance | undefined {
    return layers.get(id);
  }

  function getTopLayer(): LayerInstance | undefined {
    let top: LayerInstance | undefined;
    let topZ = -1;
    for (const layer of layers.values()) {
      if (layer.isActive() && layer.zIndex > topZ) { top = layer; topZ = layer.zIndex; }
    }
    return top;
  }

  function getLayers(): LayerInstance[] {
    return Array.from(layers.values()).sort((a, b) => a.zIndex - b.zIndex);
  }

  function getStack(): LayerInstance[] {
    return getLayers().filter((l) => l.isActive()).reverse();
  }

  async function destroyAll(): Promise<void> {
    const all = Array.from(layers.values());
    await Promise.all(all.map((l) => l.destroy()));
  }

  function getInfo() {
    return { baseZIndex, step: zIndexStep, count: layers.size };
  }

  return { createLayer, getLayer, getTopLayer, getLayers, getStack, destroyAll, getInfo };
}

// --- Helpers ---

function resolveContainer(container?: HTMLElement | string): HTMLElement {
  if (!container) return document.body;
  if (typeof container === "string") return document.querySelector(container) ?? document.body;
  return container;
}

/** Simple focus trap implementation */
function trapFocusWithin(el: HTMLElement): () => void {
  const focusableSelectors = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  el.addEventListener("keydown", handleTab);
  return () => el.removeEventListener("keydown", handleTab);

  function handleTab(e: KeyboardEvent): void {
    if (e.key !== "Tab") return;
    e.preventDefault();

    const focusable = Array.from(el.querySelectorAll<HTMLElement>(focusableSelectors));
    if (focusable.length === 0) return;

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    const active = document.activeElement as HTMLElement | null;
    const idx = active ? focusable.indexOf(active) : -1;

    if (e.shiftKey) {
      // Shift+Tab: go backwards
      const target = idx <= 0 ? last : focusable[idx - 1]!;
      target.focus();
    } else {
      // Tab: go forwards
      const target = idx >= focusable.length - 1 ? first : focusable[idx + 1]!;
      target.focus();
    }
  }
}
