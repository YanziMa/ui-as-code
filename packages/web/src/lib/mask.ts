/**
 * Overlay mask / spotlight / curtain system for modals, tours, and
 * guided onboarding. Creates a semi-transparent overlay with optional
 * cutout (spotlight) regions that reveal underlying content.
 */

// --- Types ---

export type MaskMode = "dim" | "blur" | "curtain" | "gradient";

export interface MaskOptions {
  /** Container element or selector (default: document.body) */
  container?: HTMLElement | string;
  /** Visual mode */
  mode?: MaskMode;
  /** Background color/opacity */
  color?: string;
  /** Blur amount in px (for blur mode) */
  blur?: number;
  /** Z-index */
  zIndex?: number;
  /** Animation duration ms */
  animationDuration?: number;
  /** Click outside to close callback */
  onClickOutside?: () => void;
  /** Prevent body scroll while active */
  lockScroll?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface CutoutOptions {
  /** Target element or selector */
  target: HTMLElement | string;
  /** Shape: 'rect' (default) or 'circle' */
  shape?: "rect" | "circle";
  /** Padding around the element in px */
  padding?: number;
  /** Border radius for rect cutout */
  borderRadius?: number;
  /** Border width and color */
  border?: { width?: number; color?: string };
  /** Animate the cutout? */
  animate?: boolean;
}

export interface MaskInstance {
  /** The overlay DOM element */
  element: HTMLDivElement;
  /** Show the mask */
  show: () => void;
  /** Hide the mask */
  hide: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Add a spotlight/cutout region */
  addCutout: (options: CutoutOptions) => void;
  /** Remove all cutouts */
  clearCutouts: () => void;
  /** Update mask options dynamically */
  update: (options: Partial<MaskOptions>) => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Destroy cleanup */
  destroy: () => void;
}

// --- Main ---

export function createMask(options: MaskOptions = {}): MaskInstance {
  const containerEl = resolveContainer(options.container);
  const opts = {
    mode: options.mode ?? "dim",
    color: options.color ?? "rgba(0,0,0,0.5)",
    blur: options.blur ?? 8,
    zIndex: options.zIndex ?? 9999,
    animationDuration: options.animationDuration ?? 200,
    lockScroll: options.lockScroll ?? true,
    className: options.className ?? "",
    ...options,
  };

  // Create overlay element
  const el = document.createElement("div");
  el.className = `mask-overlay ${opts.className}`;
  el.style.cssText = `
    position:fixed;inset:0;z-index:${opts.zIndex};
    display:none;pointer-events:none;transition:opacity ${opts.animationDuration}ms ease;
  `;

  let visible = false;
  let destroyed = false;
  const cutouts: Array<{ el: HTMLElement; options: CutoutOptions }> = [];
  let scrollLockCleanup: (() => void) | null = null;

  function applyMode(): void {
    switch (opts.mode) {
      case "dim":
        el.style.background = opts.color;
        el.style.backdropFilter = "";
        break;
      case "blur":
        el.style.background = opts.color;
        el.style.backdropFilter = `blur(${opts.blur}px)`;
        break;
      case "curtain":
        el.style.background = `radial-gradient(circle at center, transparent 30%, ${opts.color} 70%)`;
        el.style.backdropFilter = "";
        break;
      case "gradient":
        el.style.background = `linear-gradient(180deg, transparent 0%, ${opts.color} 100%)`;
        el.style.backdropFilter = "";
        break;
    }
  }

  function renderCutouts(): void {
    // Remove old cutout elements
    for (const co of cutouts) {
      co.el.remove();
    }
    cutouts.length = 0;

    for (const co of cutouts) {
      const target = resolveElement(co.options.target);
      if (!target) continue;

      const rect = target.getBoundingClientRect();
      const pad = co.options.padding ?? 4;
      const br = co.options.borderRadius ?? 8;

      const cutoutEl = document.createElement("div");
      cutoutEl.className = "mask-cutout";
      cutoutEl.style.cssText = `
        position:absolute;pointer-events:auto;border-radius:${br}px;
        box-shadow:0 0 0 ${pad * 2}px rgba(255,255,255,0.95);
        transition:all ${opts.animationDuration}ms ease;
      `;

      if (co.options.shape === "circle") {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const r = Math.max(rect.width, rect.height) / 2 + pad;
        cutoutEl.style.cssText += `
          left:${cx - r}px;top:${cy - r}px;width:${r * 2}px;height:${r * 2}px;
          border-radius:50%;
        `;
      } else {
        cutoutEl.style.cssText += `
          left:${rect.left - pad}px;top:${rect.top - pad}px;
          width:${rect.width + pad * 2}px;height:${rect.height + pad * 2}px;
        `;
      }

      // Optional border
      if (co.options.border) {
        const bw = co.options.border.width ?? 2;
        const bc = co.options.border.color ?? "#fff";
        cutoutEl.style.boxSizing = "border-box";
        cutoutEl.style.border = `${bw}px solid ${bc}`;
      }

      el.appendChild(cutoutEl);
      cutouts.push({ el: cutoutEl, options: co.options });
    }
  }

  function lockBodyScroll(): void {
    if (!opts.lockScroll || scrollLockCleanup) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    scrollLockCleanup = () => { document.body.style.overflow = prev; };
  }

  function unlockBodyScroll(): void {
    scrollLockCleanup?.();
    scrollLockCleanup = null;
  }

  // Click outside handler
  el.addEventListener("click", (e) => {
    if (e.target === el && opts.onClickOutside) {
      opts.onClickOutside();
    }
  });

  const instance: MaskInstance = {
    element: el,

    show() {
      if (destroyed || visible) return;
      visible = true;
      applyMode();
      el.style.display = "block";
      requestAnimationFrame(() => { el.style.opacity = "1"; });
      lockBodyScroll();
      renderCutouts();
      containerEl.appendChild(el);
    },

    hide() {
      if (destroyed || !visible) return;
      visible = false;
      el.style.opacity = "0";
      setTimeout(() => {
        el.style.display = "none";
        el.remove();
      }, opts.animationDuration);
      unlockBodyScroll();
    },

    toggle() {
      visible ? this.hide() : this.show();
    },

    addCutout(co: CutoutOptions) {
      cutouts.push({ el: document.createElement("div"), options: co });
      if (visible) renderCutouts();
    },

    clearCutouts() {
      for (const co of cutouts) co.el.remove();
      cutouts.length = 0;
    },

    update(newOpts: Partial<MaskOptions>) {
      Object.assign(opts, newOpts);
      if (visible) applyMode();
    },

    isVisible: () => visible,

    destroy() {
      destroyed = true;
      this.hide();
      el.remove();
      unlockBodyScroll();
    },
  };

  return instance;
}

// --- Convenience: Spotlight Tour Mask ---

/**
 * Create a spotlight mask that highlights a specific element.
 * Useful for onboarding tutorials.
 */
export function createSpotlight(
  target: HTMLElement | string,
  options?: Omit<MaskOptions, "container"> & {
    padding?: number;
    borderRadius?: number;
    animate?: boolean;
    onClickOutside?: () => void;
  },
): MaskInstance {
  const mask = createMask({
    ...options,
    mode: "dim",
    color: "rgba(0,0,0,0.6)",
  });

  mask.addCutout({
    target,
    shape: "rect",
    padding: options?.padding ?? 8,
    borderRadius: options?.borderRadius ?? 12,
    animate: options?.animate ?? true,
  });

  return mask;
}

// --- Helpers ---

function resolveContainer(ref?: HTMLElement | string): HTMLElement {
  if (!ref) return document.body;
  return typeof ref === "string" ? document.querySelector(ref)! : ref;
}

function resolveElement(ref: HTMLElement | string): HTMLElement | null {
  return typeof ref === "string" ? document.querySelector(ref) : ref;
}
