/**
 * Off-Canvas Utilities: Multi-directional off-canvas panel system with
 * push/nudge content effect, responsive breakpoints, multiple panels,
 * and coordinated open/close state management.
 */

// --- Types ---

export type OffCanvasSide = "start" | "end" | "top" | "bottom";
export type OffCanvasMode = "push" | "overlay" | "nudge";

export interface OffCanvasOptions {
  /** Content element or HTML string */
  content: HTMLElement | string;
  /** Panel side */
  side?: OffCanvasSide;
  /** Width for left/right, height for top/bottom */
  dimension?: number | string;
  /** Interaction mode */
  mode?: OffCanvasMode;
  /** Show backdrop */
  backdrop?: boolean;
  /** Backdrop click dismisses */
  backdropDismiss?: boolean;
  /** Escape key dismisses */
  escapeDismiss?: boolean;
  /** Animation duration (ms) */
  duration?: number;
  /** Easing function */
  easing?: string;
  /** Custom class name */
  className?: string;
  /** Z-index */
  zIndex?: number;
  /** Lock body scroll when open */
  lockScroll?: boolean;
  /** Push the main content by this amount (px) in "push" mode */
  pushAmount?: number;
  /** Element to push (in push mode) */
  pushTarget?: HTMLElement;
  /** Responsive breakpoint — auto-close below this width */
  responsiveBreakpoint?: number;
  /** Called on open */
  onOpen?: () => void;
  /** Called on close */
  onClose?: () => void;
  /** Called on resize (responsive) */
  onResponsiveChange?: (isCompact: boolean) => void;
}

export interface OffCanvasInstance {
  /** The off-canvas container element */
  el: HTMLElement;
  /** Open the panel */
  open: () => void;
  /** Close the panel */
  close: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Update content */
  setContent: (content: HTMLElement | string) => void;
  /** Check if currently in compact mode (below breakpoint) */
  isCompact: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create an off-canvas panel with push/overlay/nudge modes.
 *
 * @example
 * ```ts
 * const sidebar = createOffCanvas({
 *   content: "<nav>Sidebar nav</nav>",
 *   side: "start",
 *   mode: "push",
 *   dimension: 300,
 *   pushTarget: document.getElementById("main"),
 * });
 * sidebar.open();
 * ```
 */
export function createOffCanvas(options: OffCanvasOptions): OffCanvasInstance {
  const {
    content,
    side = "start",
    dimension = 300,
    mode = "overlay",
    backdrop = true,
    backdropDismiss = true,
    escapeDismiss = true,
    duration = 300,
    easing = "cubic-bezier(0.22,1,0.36,1)",
    className,
    zIndex = 1040,
    lockScroll = true,
    pushAmount,
    pushTarget,
    responsiveBreakpoint,
    onOpen,
    onClose,
    onResponsiveChange,
  } = options;

  let _open = false;
  let _compact = false;
  let cleanupFns: Array<() => void> = [];
  let unlockFn: (() => void) | null = null;

  // Resolve direction
  const isHorizontal = side === "start" || side === "end";
  const isStartOrLeft = side === "start" || side === "top";
  const dimProp = isHorizontal ? "width" : "height";
  const dimValue = typeof dimension === "number" ? `${dimension}px` : dimension;

  // Create container
  const container = document.createElement("div");
  container.className = `offcanvas ${className ?? ""}`.trim();
  container.style.cssText =
    "position:fixed;z-index:auto;display:none;" +
    `z-index:${zIndex};`;

  // Position based on side
  if (side === "start") {
    Object.assign(container.style, { left: "0", top: "0", bottom: "0" });
  } else if (side === "end") {
    Object.assign(container.style, { right: "0", top: "0", bottom: "0" });
  } else if (side === "top") {
    Object.assign(container.style, { left: "0", top: "0", right: "0" });
  } else {
    Object.assign(container.style, { left: "0", bottom: "0", right: "0" });
  }

  // Panel
  const panel = document.createElement("div");
  panel.className = "offcanvas-panel";

  const hiddenTransform = isHorizontal
    ? (isStartOrLeft ? "translateX(-100%)" : "translateX(100%)")
    : (isStartOrLeft ? "translateY(-100%)" : "translateY(100%)");

  panel.style.cssText =
    `${dimProp}:${dimValue};background:#fff;` +
    `transform:${hiddenTransform};transition:transform ${duration}ms ${easing};` +
    (isHorizontal
      ? `height:100%;box-shadow:${isStartOrLeft ? "4px 0 16px rgba(0,0,0,0.1)" : "-4px 0 16px rgba(0,0,0,0.1)"};`
      : `width:100%;box-shadow:${isStartOrLeft ? "0 4px 16px rgba(0,0,0,0.1)" : "0 -4px 16px rgba(0,0,0,0.1)"};`) +
    "overflow-y:auto;";

  // Content
  if (typeof content === "string") {
    panel.innerHTML = content;
  } else {
    panel.appendChild(content);
  }
  container.appendChild(panel);

  // Backdrop
  let backdropEl: HTMLElement | null = null;
  if (backdrop && mode !== "push") {
    backdropEl = document.createElement("div");
    backdropEl.className = "offcanvas-backdrop";
    backdropEl.style.cssText =
      "position:absolute;inset:0;background:rgba(0,0,0,0.3);" +
      `transition:opacity ${duration}ms ease;opacity:0;`;
    if (mode === "overlay") {
      // In overlay mode, backdrop covers everything
      if (isHorizontal) {
        backdropEl.style[isStartOrLeft ? "left" as keyof CSSStyleDeclaration : "right" as keyof CSSStyleDeclaration] = dimValue;
      }
    }
    container.insertBefore(backdropEl, panel);
  }

  document.body.appendChild(container);

  // Responsive check
  function checkResponsive(): void {
    if (!responsiveBreakpoint) return;
    _compact = window.innerWidth < responsiveBreakpoint;
    onResponsiveChange?.(_compact);
    if (_compact && _open) close();
  }

  // --- Methods ---

  function open(): void {
    if (_open) return;
    _open = true;
    container.style.display = "block";

    if (lockScroll) unlockFn = _doLockScroll();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.style.transform = "translate(0, 0)";
        if (backdropEl) backdropEl.style.opacity = "1";

        // Push mode: shift target element
        if ((mode === "push" || mode === "nudge") && pushTarget) {
          const amt = pushAmount ?? (typeof dimension === "number" ? dimension : 300);
          const prop = isHorizontal ? (isStartOrLeft ? "marginLeft" : "marginRight") : (isStartOrLeft ? "marginTop" : "marginBottom");
          pushTarget.style.transition = `margin ${duration}ms ${easing}`;
          (pushTarget.style as Record<string, string>)[prop] = `${amt}px`;
        }
      });
    });

    _setupListeners();
    onOpen?.();
  }

  function close(): void {
    if (!_open) return;
    _open = true; // Keep true during animation

    panel.style.transform = hiddenTransform;
    if (backdropEl) backdropEl.style.opacity = "0";

    // Restore pushed content
    if ((mode === "push" || mode === "nudge") && pushTarget) {
      const prop = isHorizontal ? (isStartOrLeft ? "marginLeft" : "marginRight") : (isStartOrLeft ? "marginTop" : "marginBottom");
      (pushTarget.style as Record<string, string>)[prop] = "0px";
    }

    setTimeout(() => {
      _open = false;
      container.style.display = "none";
      _removeListeners();
      unlockFn?.();
      unlockFn = null;
      onClose?.();
    }, duration);
  }

  function toggle(): void { _open ? close() : open(); }
  function isOpen(): boolean { return _open; }

  function setContent(newContent: HTMLElement | string): void {
    panel.innerHTML = "";
    if (typeof newContent === "string") {
      panel.innerHTML = newContent;
    } else {
      panel.appendChild(newContent);
    }
  }

  function isCompact(): boolean { return _compact; }

  function destroy(): void {
    if (_open) {
      _open = false;
      container.style.display = "none";
      _removeListeners();
      unlockFn?.();
    }
    container.remove();
  }

  // --- Internal ---

  function _setupListeners(): void {
    if (backdrop && backdropDismiss && backdropEl) {
      backdropEl.addEventListener("click", close);
      cleanupFns.push(() => backdropEl!.removeEventListener("click", close));
    }

    if (escapeDismiss) {
      const escHandler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
      document.addEventListener("keydown", escHandler);
      cleanupFns.push(() => document.removeEventListener("keydown", escHandler));
    }

    if (responsiveBreakpoint) {
      const resizeHandler = (): void => checkResponsive();
      window.addEventListener("resize", resizeHandler);
      cleanupFns.push(() => window.removeEventListener("resize", resizeHandler));
      checkResponsive(); // Initial check
    }
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return { el: container, open, close, toggle, isOpen, setContent, isCompact, destroy };
}

/** Simple scroll lock helper */
function _doLockScroll(): () => void {
  const body = document.body;
  const origOverflow = body.style.overflow;
  const origPR = body.style.paddingRight;
  const sbWidth = window.innerWidth - document.documentElement.clientWidth;

  body.style.overflow = "hidden";
  if (sbWidth > 0) {
    const pr = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${pr + sbWidth}px`;
  }

  return () => {
    body.style.overflow = origOverflow;
    body.style.paddingRight = origPR;
  };
}
