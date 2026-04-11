/**
 * Affix Utilities: Stick elements to viewport when scrolling past a
 * threshold, with offset handling, container constraints, position
 * switching (fixed/absolute), placeholder preservation, and callbacks.
 */

// --- Types ---

export type AffixPosition = "top" | "bottom";

export interface AffixOptions {
  /** The element to affix */
  target: HTMLElement;
  /** Offset from viewport edge in px. Default 0 */
  offsetTop?: number;
  /** Offset from bottom edge in px */
  offsetBottom?: number;
  /** Use bottom-affix mode? Default false (top) */
  position?: AffixPosition;
  /** Z-index when affixed */
  zIndex?: number;
  /** Width behavior: "auto" = measure original, "stretch" = fill container */
  widthMode?: "auto" | "stretch";
  /** Container to constrain affixed position within */
  container?: HTMLElement | Window;
  /** Custom class added when affixed */
  className?: string;
  /** Called when element becomes affixed */
  onAffix?: () => void;
  /** Called when element un-affixes (returns to normal flow) */
  onUnfix?: () => void;
  /** Use IntersectionObserver for performance? Default true */
  useIO?: boolean;
}

export interface AffixInstance {
  /** The target element */
  el: HTMLElement;
  /** Check if currently affixed */
  isAffixed: () => boolean;
  /** Manually trigger affix check */
  update: () => void;
  /** Change offset dynamically */
  setOffset: (offset: number) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create an affixed element that sticks when scrolling past its threshold.
 *
 * @example
 * ```ts
 * const affix = createAffix({
 *   target: headerEl,
 *   offsetTop: 64,
 *   zIndex: 100,
 * });
 * // headerEl sticks 64px from top when scrolled past it
 * ```
 */
export function createAffix(options: AffixOptions): AffixInstance {
  const {
    target,
    offsetTop = 0,
    offsetBottom,
    position = "top",
    zIndex = 100,
    widthMode = "auto",
    container,
    className,
    onAffix,
    onUnfix,
    useIO = true,
  } = options;

  let _affixed = false;
  let _currentOffset = offsetTop;
  let _placeholder: HTMLDivElement | null = null;
  let _originalStyles: Record<string, string> = {};
  let cleanupFns: Array<() => void> = [];

  // Save original inline styles we'll modify
  function saveOriginalStyles(): void {
    _originalStyles = {
      position: target.style.position || "",
      top: target.style.top || "",
      left: target.style.left || "",
      width: target.style.width || "",
      zIndex: target.style.zIndex || "",
    };
  }

  saveOriginalStyles();

  // Create invisible placeholder to preserve layout
  function ensurePlaceholder(): void {
    if (_placeholder) return;
    _placeholder = document.createElement("div");
    _placeholder.className = "affix-placeholder";
    _placeholder.style.cssText =
      "display:none;visibility:hidden;pointer-events:none;margin:0;padding:0;";
    target.parentNode?.insertBefore(_placeholder, target);
  }

  function applyAffix(): void {
    if (_affixed) return;
    _affixed = true;

    ensurePlaceholder();

    // Measure before changing
    const rect = target.getBoundingClientRect();
    const originalWidth = widthMode === "stretch"
      ? (target.parentElement?.getBoundingClientRect().width ?? rect.width)
      : rect.width;

    // Show placeholder at original size
    if (_placeholder) {
      _placeholder.style.display = "";
      _placeholder.style.height = `${rect.height}px`;
      _placeholder.style.width = `${originalWidth}px`;
    }

    // Apply fixed positioning
    target.style.position = "fixed";
    if (position === "top") {
      target.style.top = `${_currentOffset}px`;
      target.style.bottom = "";
    } else {
      target.style.bottom = `${offsetBottom ?? _currentOffset}px`;
      target.style.top = "";
    }
    target.style.left = `${rect.left}px`;
    target.style.width = `${originalWidth}px`;
    target.style.zIndex = String(zIndex);

    if (className) target.classList.add(className);

    onAffix?.();
  }

  function removeAffix(): void {
    if (!_affixed) return;
    _affixed = false;

    // Hide placeholder
    if (_placeholder) {
      _placeholder.style.display = "none";
    }

    // Restore original styles
    target.style.position = _originalStyles.position || "";
    target.style.top = _originalStyles.top || "";
    target.style.left = _originalStyles.left || "";
    target.style.width = _originalStyles.width || "";
    target.style.zIndex = _originalStyles.zIndex || "";

    if (className) target.classList.remove(className);

    onUnfix?.();
  }

  function checkScroll(): void {
    if (position === "top") {
      const rect = target.getBoundingClientRect();
      // When using placeholder, check where the placeholder would be
      const referenceEl = _affixed ? _placeholder! : target;
      const refRect = referenceEl.getBoundingClientRect();

      if (refRect.top <= _currentOffset && !_affixed) {
        applyAffix();
      } else if (_affixed) {
        // Check if we've scrolled back above the original position
        // The placeholder's top tells us where the element originally was
        if (_placeholder) {
          const phRect = _placeholder!.getBoundingClientRect();
          if (phRect.top > _currentOffset) {
            removeAffix();
          }
        } else {
          if (rect.top > _currentOffset) {
            removeAffix();
          }
        }
      }
    } else {
      // Bottom affix
      const rect = target.getBoundingClientRect();
      const viewH = window.innerHeight;
      const threshold = offsetBottom ?? _currentOffset;

      if (rect.bottom >= viewH - threshold && !_affixed) {
        applyAffix();
      } else if (_affixed) {
        if (_placeholder) {
          const phRect = _placeholder!.getBoundingClientRect();
          if (phRect.bottom < viewH - threshold) {
            removeAffix();
          }
        } else {
          if (rect.bottom < viewH - threshold) {
            removeAffix();
          }
        }
      }
    }
  }

  // --- Setup listeners ---

  function setupListeners(): void {
    if (useIO && "IntersectionObserver" in window) {
      // Use IntersectionObserver for performance
      const sentinel = document.createElement("div");
      sentinel.style.cssText = "position:absolute;width:1px;height:1px;";
      target.parentNode?.insertBefore(sentinel, target);

      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const ratio = entry.intersectionRatio;
            if (ratio <= 0 && !_affixed) {
              applyAffix();
            } else if (ratio > 0 && _affixed) {
              // For top affix, unfix when sentinel is visible again
              if (position === "top") removeAffix();
            }
          }
        },
        {
          rootMargin: position === "top"
            ? `-${_currentOffset + 1}px 0px 0px 0px`
            : `0px 0px -${(offsetBottom ?? _currentOffset) + 1}px 0px`,
          threshold: [0, 1],
        },
      );

      io.observe(sentinel);
      cleanupFns.push(() => { io.disconnect(); sentinel.remove(); });
    } else {
      // Fallback to scroll event
      const scrollHandler = () => checkScroll();
      window.addEventListener("scroll", scrollHandler, { passive: true });
      cleanupFns.push(() => window.removeEventListener("scroll", scrollHandler));
    }

    // Also listen on resize to recalculate widths
    const resizeHandler = () => { if (_affixed) updateWidth(); };
    window.addEventListener("resize", resizeHandler, { passive: true });
    cleanupFns.push(() => window.removeEventListener("resize", resizeHandler));
  }

  function updateWidth(): void {
    if (!_affixed) return;
    const newWidth = widthMode === "stretch"
      ? (target.parentElement?.getBoundingClientRect().width ?? target.offsetWidth)
      : (_placeholder?.getBoundingClientRect().width ?? target.offsetWidth);
    target.style.width = `${newWidth}px`;

    // Update left position
    if (_placeholder) {
      target.style.left = `${_placeholder.getBoundingClientRect().left}px`;
    }
  }

  setupListeners();

  // Initial check
  checkScroll();

  // --- API ---

  function isAffixed(): boolean { return _affixed; }

  function update(): void {
    checkScroll();
    if (_affixed) updateWidth();
  }

  function setOffset(offset: number): void {
    _currentOffset = offset;
    // Re-setup IO if using it
    update();
  }

  function destroy(): void {
    removeAffix();
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
    _placeholder?.remove();
    _placeholder = null;
  }

  return { el: target, isAffixed, update, setOffset, destroy };
}
