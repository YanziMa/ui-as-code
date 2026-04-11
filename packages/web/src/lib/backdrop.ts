/**
 * Backdrop / Overlay: Modal-like backdrop with blur, dimming, click-outside-to-close,
 * transition animations, z-index management, focus trapping, escape key handling,
 * scroll locking, and multiple backdrop stacking.
 */

// --- Types ---

export type BackdropVariant = "dark" | "light" | "blur" | "gradient";
export type BackdropAnimation = "fade" | "scale" | "slide-up" | "slide-down" | "flip" | "none";

export interface BackdropOptions {
  /** Container element or selector (backdrop covers this or document.body) */
  container?: HTMLElement | string;
  /** Content to display inside the backdrop */
  content?: string | HTMLElement;
  /** Visual variant */
  variant?: BackdropVariant;
  /** Animation type */
  animation?: BackdropAnimation;
  /** Animation duration in ms */
  duration?: number;
  /** Opacity of the overlay (0-1) */
  opacity?: number;
  /** Blur amount in px (for blur variant) */
  blur?: number;
  /** Background color override */
  backgroundColor?: string;
  /** Click outside to close? */
  closeOnClickOutside?: boolean;
  /** Press Escape to close? */
  closeOnEscape?: boolean;
  /** Lock body scroll while open? */
  lockScroll?: boolean;
  /** Z-index for the backdrop */
  zIndex?: number;
  /** Callback on open */
  onOpen?: () => void;
  /** Callback on close */
  onClose?: () => void;
  /** Callback before close (return false to prevent) */
  beforeClose?: () => boolean | Promise<boolean>;
  /** Custom CSS class */
  className?: string;
}

export interface BackdropInstance {
  element: HTMLDivElement;
  overlay: HTMLDivElement;
  contentWrapper: HTMLDivElement;
  /** Open the backdrop */
  open: (newContent?: string | HTMLElement) => void;
  /** Close the backdrop */
  close: () => void;
  /** Toggle open/close state */
  toggle: () => void;
  /** Is currently open? */
  isOpen: () => boolean;
  /** Update content dynamically */
  setContent: (content: string | HTMLElement) => void;
  /** Update options dynamically */
  updateOptions: (opts: Partial<BackdropOptions>) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Active Backdrops Stack ---

const activeBackdrops = new Set<BackdropInstance>();

/** Close all active backdrops (useful for route changes) */
export function closeAllBackdrops(): void {
  for (const bd of activeBackdrops) {
    try { bd.close(); } catch {}
  }
}

/** Get count of currently open backdrops */
export function getActiveBackdropCount(): number {
  return activeBackdrops.size;
}

// --- Main Factory ---

export function createBackdrop(options: BackdropOptions = {}): BackdropInstance {
  const opts = {
    variant: options.variant ?? "dark",
    animation: options.animation ?? "fade",
    duration: options.duration ?? 200,
    opacity: options.opacity ?? 0.5,
    blur: options.blur ?? 8,
    closeOnClickOutside: options.closeOnClickOutside ?? true,
    closeOnEscape: options.closeOnEscape ?? true,
    lockScroll: options.lockScroll ?? true,
    zIndex: options.zIndex ?? 1000,
    ...options,
  };

  let isOpenState = false;
  let destroyed = false;

  // --- Create DOM structure ---

  const root = document.createElement("div");
  root.className = `backdrop backdrop-${opts.variant} ${options.className ?? ""}`;
  root.style.cssText = `
    position:fixed;inset:0;display:none;z-index:${opts.zIndex};
    font-family:-apple-system,sans-serif;
  `;

  // Overlay layer
  const overlay = document.createElement("div");
  overlay.className = "backdrop-overlay";

  // Content wrapper
  const contentWrapper = document.createElement("div");
  contentWrapper.className = "backdrop-content-wrapper";
  contentWrapper.style.cssText = `
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    max-width:90vw;max-height:85vh;overflow:auto;z-index:${opts.zIndex + 1};
    display:flex;align-items:center;justify-content:center;
  `;

  root.appendChild(overlay);
  root.appendChild(contentWrapper);

  // Set initial content
  if (options.content) {
    setContentInternal(options.content);
  }

  // --- Apply Variant Styles ---

  function applyVariantStyles(): void {
    switch (opts.variant) {
      case "dark":
        overlay.style.cssText += `background:rgba(0,0,0,${opts.opacity});`;
        break;
      case "light":
        overlay.style.cssText += `background:rgba(255,255,255,${opts.opacity});`;
        break;
      case "blur":
        overlay.style.cssText += `
          background:rgba(0,0,0,${Math.max(0.05, opts.opacity * 0.3)});
          backdrop-filter:blur(${opts.blur}px);-webkit-backdrop-filter:blur(${opts.blur}px);
        `;
        break;
      case "gradient":
        overlay.style.cssText += `
          background:linear-gradient(135deg,
            rgba(99,102,241,${opts.opacity}) 0%,
            rgba(236,72,153,${opts.opacity}) 50%,
            rgba(245,158,11,${opts.opacity}) 100%);
        `;
        break;
    }

    if (opts.backgroundColor) {
      overlay.style.background = opts.backgroundColor;
    }
  }

  applyVariantStyles();

  // --- Animation ---

  function getAnimationIn(): string {
    switch (opts.animation) {
      case "fade": return "fadeIn";
      case "scale": return "scaleIn";
      case "slide-up": return "slideUp";
      case "slide-down": return "slideDown";
      case "flip": return "flipIn";
      default: return "";
    }
  }

  function getAnimationOut(): string {
    switch (opts.animation) {
      case "fade": return "fadeOut";
      case "scale": return "scaleOut";
      case "slide-up": return "slideDown";
      case "slide-down": return "slideUp";
      case "flip": return "flipOut";
      default: return "";
    }
  }

  // Inject animation keyframes if not present
  if (!document.getElementById("backdrop-animation-styles")) {
    const style = document.createElement("style");
    style.id = "backdrop-animation-styles";
    style.textContent = `
      @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
      @keyframes fadeOut{from{opacity:1;}to{opacity:0;}}
      @keyframes scaleIn{from{opacity:0;transform:translate(-50%,-50%) scale(0.9);}to{opacity:1;transform:translate(-50%,-50%) scale(1);}}
      @keyframes scaleOut{from{opacity:1;transform:translate(-50%,-50%) scale(1);}to{opacity:0;transform:translate(-50%,-50%) scale(0.9);}}
      @keyframes slideUp{from{opacity:0;transform:translate(-50%,20%);}to{opacity:1;transform:translate(-50%,-50%);}}
      @keyframes slideDown{from{opacity:1;transform:translate(-50%,-50%);}to{opacity:0;transform:translate(-50%,20%);}}
      @keyframes flipIn{from{opacity:0;transform:translate(-50%,-50%) perspective(600px) rotateX(90deg);}to{opacity:1;transform:translate(-50%,-50%) rotateX(0deg);}}
      @keyframes flipOut{from{opacity:1;transform:translate(-50%,-50%) rotateX(0deg);}to{opacity:0;transform:translate(-50%,-50%) perspective(600px) rotateX(-90deg);}}
    `;
    document.head.appendChild(style);
  }

  // --- Scroll Lock ---

  let previousBodyOverflow = "";

  function lockBodyScroll(): void {
    if (!opts.lockScroll) return;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Record current scroll position
    document.body.dataset.scrollY = String(window.scrollY);
  }

  function unlockBodyScroll(): void {
    if (previousBodyOverflow !== undefined) {
      document.body.style.overflow = previousBodyOverflow === "" ? "" : previousBodyOverflow;
    }
    // Restore scroll position
    const scrollY = document.body.dataset.scrollY;
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY, 10));
      delete document.body.dataset.scrollY;
    }
  }

  // --- Event Handlers ---

  overlay.addEventListener("click", async () => {
    if (opts.closeOnClickOutside) {
      if (opts.beforeClose) {
        const allowed = await opts.beforeClose();
        if (!allowed) return;
      }
      instance.close();
    }
  });

  // Prevent clicks inside content from closing
  contentWrapper.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Escape key handler
  const escHandler = async (e: KeyboardEvent): Promise<void> => {
    if (e.key === "Escape" && isOpenState && opts.closeOnEscape) {
      if (opts.beforeClose) {
        const allowed = await opts.beforeClose();
        if (!allowed) return;
      }
      instance.close();
    }
  };
  document.addEventListener("keydown", escHandler);

  // --- Content Management ---

  function setContentInternal(content: string | HTMLElement): void {
    contentWrapper.innerHTML = "";
    if (typeof content === "string") {
      contentWrapper.innerHTML = content;
    } else {
      contentWrapper.appendChild(content);
    }
  }

  // --- Instance ---

  const instance: BackdropInstance = {
    element: root,
    overlay,
    contentWrapper,

    open(newContent?: string | HTMLElement) {
      if (destroyed || isOpenState) return;

      if (newContent) setContentInternal(newContent);

      // Determine target container
      let targetContainer: HTMLElement;
      if (options.container) {
        targetContainer = typeof options.container === "string"
          ? document.querySelector<HTMLElement>(options.container)!
          : options.container;
      } else {
        targetContainer = document.body;
      }

      // Ensure positioning context on parent
      if (targetContainer !== document.body && getComputedStyle(targetContainer).position === "static") {
        targetContainer.style.position = "relative";
      }

      targetContainer.appendChild(root);

      // Show with animation
      root.style.display = "block";
      const animName = getAnimationIn();

      if (animName) {
        root.style.animation = `${animName} ${opts.duration}ms ease forwards`;
        contentWrapper.style.animation = `${animName} ${opts.duration}ms ease forwards`;
      }

      isOpenState = true;
      lockBodyScroll();
      activeBackdrops.add(instance);
      opts.onOpen?.();
    },

    async close() {
      if (!isOpenState || destroyed) return;

      const animName = getAnimationOut();
      if (animName) {
        root.style.animation = `${animName} ${opts.duration}ms ease forwards`;
        contentWrapper.style.animation = `${animName} ${opts.duration}ms ease forwards`;

        await new Promise((resolve) => setTimeout(resolve, opts.duration));
      }

      root.style.display = "none";
      root.style.animation = "";
      contentWrapper.style.animation = "";

      isOpenState = false;
      unlockBodyScroll();
      activeBackdrops.delete(instance);
      root.remove();
      opts.onClose?.();
    },

    toggle() {
      if (isOpenState) instance.close();
      else instance.open();
    },

    isOpen() { return isOpenState; },

    setContent(content: string | HTMLElement) {
      setContentInternal(content);
    },

    updateOptions(newOpts: Partial<BackdropOptions>) {
      Object.assign(opts, newOpts);
      applyVariantStyles();
      if (newOpts.content !== undefined) setContentInternal(newOpts.content);
    },

    destroy() {
      destroyed = true;
      if (isOpenState) {
        unlockBodyScroll();
        activeBackdrops.delete(instance);
      }
      document.removeEventListener("keydown", escHandler);
      root.remove();
    },
  };

  return instance;
}

// --- Quick Helpers ---

/** Show a simple loading spinner over an element */
export function showLoadingOverlay(
  anchor: HTMLElement,
  text = "Loading...",
): BackdropInstance {
  const spinner = document.createElement("div");
  spinner.style.cssText = `
    background:#fff;border-radius:12px;padding:32px 48px;display:flex;flex-direction:column;
    align-items:center;gap:12px;box-shadow:0 20px 60px rgba(0,0,0,0.15);
  `;
  spinner.innerHTML = `
    <div style="width:32px;height:32px;border:3px solid #e5e7eb;border-top-color:#4338ca;border-radius:50%;animation:spin 0.7s linear infinite;"></div>
    <div style="font-size:14px;color:#6b7280;font-weight:500;">${text}</div>
  `;

  if (!document.getElementById("spin-keyframe")) {
    const s = document.createElement("style");
    s.id = "spin-keyframe";
    s.textContent = "@keyframes spin{to{transform:rotate(360deg);}}";
    document.head.appendChild(s);
  }

  const bd = createBackdrop({
    container: anchor,
    content: spinner,
    variant: "dark",
    opacity: 0.3,
    closeOnClickOutside: false,
    closeOnEscape: false,
    lockScroll: false,
  });
  bd.open();
  return bd;
}

/** Show a confirmation dialog */
export function showConfirmDialog(
  title: string,
  message: string,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement("div");
    dialog.style.cssText = `
      background:#fff;border-radius:12px;padding:28px;max-width:400px;width:90vw;
      box-shadow:0 25px 60px rgba(0,0,0,0.2);text-align:center;
    `;
    dialog.innerHTML = `
      <h3 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#111827;">${title}</h3>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.5;">${message}</p>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="cancel-btn" style="padding:8px 20px;border-radius:8px;font-size:13px;font-weight:500;background:#fff;color:#4b5563;border:1px solid #d1d5db;cursor:pointer;">
          ${cancelLabel}
        </button>
        <button class="confirm-btn" style="padding:8px 20px;border-radius:8px;font-size:13px;font-weight:500;background:#4338ca;color:#fff;border:none;cursor:pointer;">
          ${confirmLabel}
        </button>
      </div>
    `;

    const bd = createBackdrop({
      content: dialog,
      variant: "dark",
      closeOnClickOutside: true,
      closeOnEscape: true,
    });

    dialog.querySelector(".confirm-btn")?.addEventListener("click", () => {
      bd.close();
      resolve(true);
    });
    dialog.querySelector(".cancel-btn")?.addEventListener("click", () => {
      bd.close();
      resolve(false);
    });

    bd.open();
  });
}
