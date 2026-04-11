/**
 * Overlay Utilities: Create and manage modal/drawer/popover overlays with
 * backdrop, animations, z-index stacking, escape key handling, click-outside
 * dismissal, portal rendering, and lifecycle hooks.
 */

// --- Types ---

export type OverlayPlacement = "center" | "top" | "bottom" | "left" | "right" |
  "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type OverlayAnimation = "fade" | "scale" | "slide-up" | "slide-down" |
  "slide-left" | "slide-right" | "none";

export interface OverlayOptions {
  /** Content element or HTML string */
  content: HTMLElement | string;
  /** Where to place the overlay */
  placement?: OverlayPlacement;
  /** Animation type */
  animation?: OverlayAnimation;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Show backdrop overlay */
  backdrop?: boolean;
  /** Backdrop click dismisses */
  backdropDismiss?: boolean;
  /** Escape key dismisses */
  escapeDismiss?: boolean;
  /** Custom backdrop style */
  backdropStyle?: string;
  /** Custom container class */
  className?: string;
  /** Z-index for the overlay */
  zIndex?: number;
  /** Portal target (default: document.body) */
  container?: HTMLElement;
  /** Lock body scroll when open */
  lockScroll?: boolean;
  /** Focus trap inside overlay */
  focusTrap?: boolean;
  /** Auto-focus on open */
  autoFocus?: boolean;
  /** Called when overlay opens */
  onOpen?: () => void;
  /** Called when overlay closes */
  onClose?: () => void;
  /** Called before close (return false to prevent) */
  beforeClose?: () => boolean | Promise<boolean>;
}

export interface OverlayInstance {
  /** The overlay container element */
  el: HTMLElement;
  /** The content element */
  contentEl: HTMLElement;
  /** The backdrop element (if any) */
  backdropEl: HTMLElement | null;
  /** Open the overlay */
  open: () => void;
  /** Close the overlay */
  close: () => void;
  /** Toggle open/close state */
  toggle: () => void;
  /** Check if currently open */
  isOpen: () => boolean;
  /** Update content */
  updateContent: (content: HTMLElement | string) => void;
  /** Destroy and remove from DOM */
  destroy: () => void;
}

// --- Z-Index Manager ---

let globalZIndex = 1000;

/** Get next available z-index */
export function getNextZIndex(base = 1000): number {
  globalZIndex = Math.max(globalZIndex + 1, base);
  return globalZIndex;
}

/** Reset z-index counter */
export function resetZIndexCounter(value = 1000): void {
  globalZIndex = value;
}

// --- Core Overlay Factory ---

/**
 * Create an overlay with backdrop, animation, and lifecycle management.
 *
 * @example
 * ```ts
 * const overlay = createOverlay({
 *   content: "<h2>Modal Content</h2>",
 *   placement: "center",
 *   animation: "scale",
 *   backdrop: true,
 *   escapeDismiss: true,
 * });
 * overlay.open();
 * // later:
 * overlay.close();
 * ```
 */
export function createOverlay(options: OverlayOptions): OverlayInstance {
  const {
    content,
    placement = "center",
    animation = "fade",
    animationDuration = 200,
    backdrop = true,
    backdropDismiss = true,
    escapeDismiss = true,
    backdropStyle,
    className,
    zIndex,
    container = document.body,
    lockScroll = true,
    focusTrap = false,
    autoFocus = true,
    onOpen,
    onClose,
    beforeClose,
  } = options;

  let _isOpen = false;
  let cleanupFns: Array<() => void> = [];
  let unlockScrollFn: (() => void) | null = null;
  let focusTrapCleanup: (() => void) | null = null;

  // Create DOM structure
  const wrapper = document.createElement("div");
  wrapper.className = `overlay-wrapper ${className ?? ""}`.trim();
  wrapper.style.cssText = _getWrapperStyles(placement);

  // Backdrop
  let backdropEl: HTMLElement | null = null;
  if (backdrop) {
    backdropEl = document.createElement("div");
    backdropEl.className = "overlay-backdrop";
    backdropEl.style.cssText =
      backdropStyle ??
      "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:-1;" +
      `transition:opacity ${animationDuration}ms ease;`;
    wrapper.appendChild(backdropEl);
  }

  // Content container
  const contentContainer = document.createElement("div");
  contentContainer.className = "overlay-content";
  contentContainer.style.cssText = _getContentStyles(placement, animation);

  // Content element
  const contentEl = typeof content === "string"
    ? (_createContentElement(content))
    : content;
  contentContainer.appendChild(contentEl);

  wrapper.appendChild(contentContainer);
  wrapper.style.display = "none";
  container.appendChild(wrapper);

  // Set z-index
  const finalZIndex = zIndex ?? getNextZIndex();
  wrapper.style.zIndex = String(finalZIndex);

  // --- Methods ---

  function open(): void {
    if (_isOpen) return;
    _isOpen = true;

    // Lock scroll
    if (lockScroll) {
      unlockScrollFn = _lockBodyScroll();
    }

    // Show with animation
    wrapper.style.display = "";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        _applyEnterAnimation(wrapper, contentContainer, backdropEl, animation, animationDuration);
      });
    });

    // Focus trap
    if (focusTrap && autoFocus) {
      setTimeout(() => {
        const focusable = contentEl.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]',
        );
        focusable?.focus();
      }, animationDuration + 10);
    }

    // Event listeners
    if (escapeDismiss) {
      const escHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape") close();
      };
      document.addEventListener("keydown", escHandler);
      cleanupFns.push(() => document.removeEventListener("keydown", escHandler));
    }

    if (backdrop && backdropDismiss && backdropEl) {
      const clickHandler = (e: MouseEvent) => {
        if (e.target === backdropEl) close();
      };
      backdropEl.addEventListener("click", clickHandler);
      cleanupFns.push(() => backdropEl!.removeEventListener("click", clickHandler));
    }

    onOpen?.();
  }

  async close(): Promise<void> {
    if (!_isOpen) return;

    // Check beforeClose hook
    if (beforeClose) {
      const canClose = await beforeClose();
      if (!canClose) return;
    }

    _isOpen = false;

    // Exit animation
    await _applyExitAnimation(wrapper, contentContainer, backdropEl, animation, animationDuration);

    wrapper.style.display = "none";

    // Cleanup
    for (const fn of cleanupFns) fn();
    cleanupFns = [];

    // Unlock scroll
    unlockScrollFn?.();
    unlockScrollFn = null;

    onClose?.();
  }

  function toggle(): void {
    _isOpen ? close() : open();
  }

  function isOpen(): boolean { return _isOpen; }

  function updateContent(newContent: HTMLElement | string): void {
    contentContainer.innerHTML = "";
    const newEl = typeof newContent === "string"
      ? _createContentElement(newContent)
      : newContent;
    contentContainer.appendChild(newEl);
  }

  function destroy(): void {
    if (_isOpen) {
      // Force close without animation
      _isOpen = false;
      wrapper.style.display = "none";
      for (const fn of cleanupFns) fn();
      cleanupFns = [];
      unlockScrollFn?.();
    }
    wrapper.remove();
  }

  return { el: wrapper, contentEl, backdropEl, open, close, toggle, isOpen, updateContent, destroy };
}

// --- Style Generators ---

function _getWrapperStyles(placement: OverlayPlacement): string {
  switch (placement) {
    case "center":
      return "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;";
    case "top":
      return "position:fixed;inset:0;display:flex;align-items:flex-start;justify-content:center;padding-top:10vh;";
    case "bottom":
      return "position:fixed;inset:0;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2rem;";
    case "left":
      return "position:fixed;inset:0;display:flex;align-items:center;justify-content:flex-start;padding-left:2rem;";
    case "right":
      return "position:fixed;inset:0;display:flex;align-items:center;justify-content:flex-end;padding-right:2rem;";
    default:
      return "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;";
  }
}

function _getContentStyles(
  placement: OverlayPlacement,
  animation: OverlayAnimation,
): string {
  const base = "position:relative;z-index:1;max-width:90vw;max-height:90vh;overflow:auto;";

  switch (animation) {
    case "scale":
      return base + "transform:scale(0.95);opacity:0;transition:transform 0.2s ease, opacity 0.2s ease;";
    case "slide-up":
      return base + "transform:translateY(20px);opacity:0;transition:transform 0.2s ease, opacity 0.2s ease;";
    case "slide-down":
      return base + "transform:translateY(-20px);opacity:0;transition:transform 0.2s ease, opacity 0.2s ease;";
    case "slide-left":
      return base + "transform:translateX(20px);opacity:0;transition:transform 0.2s ease, opacity 0.2s ease;";
    case "slide-right":
      return base + "transform:translateX(-20px);opacity:0;transition:transform 0.2s ease, opacity 0.2s ease;";
    case "fade":
    default:
      return base + "opacity:0;transition:opacity 0.2s ease;";
  }
}

// --- Animation Helpers ---

function _applyEnterAnimation(
  wrapper: HTMLElement,
  content: HTMLElement,
  backdrop: HTMLElement | null,
  animation: OverlayAnimation,
  duration: number,
): void {
  switch (animation) {
    case "scale":
      content.style.transform = "scale(1)";
      content.style.opacity = "1";
      break;
    case "slide-up":
      content.style.transform = "translateY(0)";
      content.style.opacity = "1";
      break;
    case "slide-down":
      content.style.transform = "translateY(0)";
      content.style.opacity = "1";
      break;
    case "slide-left":
      content.style.transform = "translateX(0)";
      content.style.opacity = "1";
      break;
    case "slide-right":
      content.style.transform = "translateX(0)";
      content.style.opacity = "1";
      break;
    case "fade":
    case "none":
    default:
      content.style.opacity = "1";
      break;
  }
  if (backdrop) backdrop.style.opacity = "1";
}

function _applyExitAnimation(
  wrapper: HTMLElement,
  content: HTMLElement,
  backdrop: HTMLElement | null,
  animation: OverlayAnimation,
  duration: number,
): Promise<void> {
  return new Promise((resolve) => {
    switch (animation) {
      case "scale":
        content.style.transform = "scale(0.95)";
        content.style.opacity = "0";
        break;
      case "slide-up":
        content.style.transform = "translateY(20px)";
        content.style.opacity = "0";
        break;
      case "slide-down":
        content.style.transform = "translateY(-20px)";
        content.style.opacity = "0";
        break;
      case "slide-left":
        content.style.transform = "translateX(20px)";
        content.style.opacity = "0";
        break;
      case "slide-right":
        content.style.transform = "translateX(-20px)";
        content.style.opacity = "0";
        break;
      case "fade":
      case "none":
      default:
        content.style.opacity = "0";
        break;
    }
    if (backdrop) backdrop.style.opacity = "0";
    setTimeout(resolve, duration);
  });
}

// --- Helpers ---

function _createContentElement(html: string): HTMLDivElement {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div;
}

/** Simple body scroll lock for overlays */
function _lockBodyScroll(): () => void {
  const body = document.body;
  const originalOverflow = body.style.overflow;
  const originalPaddingRight = body.style.paddingRight;

  // Calculate scrollbar width
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  body.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    const currentPR = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${currentPR + scrollbarWidth}px`;
  }

  return () => {
    body.style.overflow = originalOverflow;
    body.style.paddingRight = originalPaddingRight;
  };
}
