/**
 * Sheet Utilities: Slide-in panel/sheet component (bottom sheet, side sheet)
 * with drag-to-dismiss, snap points, backdrop, animation, and responsive behavior.
 */

// --- Types ---

export type SheetSide = "top" | "bottom" | "left" | "right";
export type SheetSize = "sm" | "md" | "lg" | "xl" | "full" | "auto" | number;

export interface SheetOptions {
  /** Content element or HTML string */
  content: HTMLElement | string;
  /** Which side the sheet slides in from */
  side?: SheetSide;
  /** Size of the sheet */
  size?: SheetSize;
  /** Show backdrop overlay */
  backdrop?: boolean;
  /** Click backdrop to dismiss */
  backdropDismiss?: boolean;
  /** Escape key to dismiss */
  escapeDismiss?: boolean;
  /** Enable drag/swipe to dismiss (for top/bottom sheets) */
  dismissible?: boolean;
  /** Drag threshold before dismissal (px) */
  dismissThreshold?: number;
  /** Snap points for bottom sheet (fraction of full height: 0-1) */
  snapPoints?: number[];
  /** Initial snap point index */
  initialSnap?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Custom class name */
  className?: string;
  /** Z-index */
  zIndex?: number;
  /** Lock body scroll when open */
  lockScroll?: boolean;
  /** Header element or HTML */
  header?: HTMLElement | string;
  /** Footer element or HTML */
  footer?: HTMLElement | string;
  /** Called when sheet opens */
  onOpen?: () => void;
  /** Called when sheet closes */
  onClose?: () => void;
  /** Called when snap point changes */
  onSnapChange?: (snapIndex: number) => void;
  /** Called during drag with progress (0-1) */
  onDrag?: (progress: number) => void;
}

export interface SheetInstance {
  /** The sheet container element */
  el: HTMLElement;
  /** Open the sheet */
  open: () => void;
  /** Close the sheet */
  close: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Snap to a specific point */
  snapTo: (index: number) => void;
  /** Get current snap point index */
  getCurrentSnap: () => number;
  /** Update content */
  setContent: (content: HTMLElement | string) => void;
  /** Destroy and remove */
  destroy: () => void;
}

// --- Size Map ---

const SIZE_MAP: Record<string, string> = {
  "sm": "380px",
  "md": "480px",
  "lg": "640px",
  "xl": "800px",
  "full": "100%",
  "auto": "auto",
};

// --- Core Factory ---

/**
 * Create a slide-in sheet panel.
 *
 * @example
 * ```ts
 * const sheet = createSheet({
 *   content: "<div>Sheet content</div>",
 *   side: "bottom",
 *   size: "md",
 *   dismissible: true,
 * });
 * sheet.open();
 * ```
 */
export function createSheet(options: SheetOptions): SheetInstance {
  const {
    content,
    side = "bottom",
    size = "md",
    backdrop = true,
    backdropDismiss = true,
    escapeDismiss = true,
    dismissible = false,
    dismissThreshold = 100,
    snapPoints,
    initialSnap = 0,
    animationDuration = 300,
    className,
    zIndex = 1100,
    lockScroll = true,
    header,
    footer,
    onOpen,
    onClose,
    onSnapChange,
    onDrag,
  } = options;

  let _open = false;
  let _currentSnap = initialSnap;
  let cleanupFns: Array<() => void> = [];
  let unlockScrollFn: (() => void) | null = null;
  let isDragging = false;
  let dragStartY = 0;
  let dragStartX = 0;
  let sheetStartTransform = 0;

  // Determine dimension property
  const isVertical = side === "top" || side === "bottom";
  const dimProp = isVertical ? "height" : "width";
  const sizeValue = typeof size === "number" ? `${size}px` : (SIZE_MAP[size] ?? size);

  // Create wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `sheet-overlay ${className ?? ""}`.trim();
  wrapper.style.cssText =
    "position:fixed;inset:0;z-index:auto;display:none;align-items:flex-end;" +
    "justify-content:center;" +
    `z-index:${zIndex};`;

  // Adjust alignment based on side
  if (side === "top") wrapper.style.alignItems = "flex-start";
  else if (side === "left") wrapper.style.justifyContent = "flex-start";
  else if (side === "right") wrapper.style.justifyContent = "flex-end";

  // Backdrop
  let backdropEl: HTMLElement | null = null;
  if (backdrop) {
    backdropEl = document.createElement("div");
    backdropEl.className = "sheet-backdrop";
    backdropEl.style.cssText =
      "position:absolute;inset:0;background:rgba(0,0,0,0.4);" +
      `transition:opacity ${animationDuration}ms ease;opacity:0;`;
    wrapper.appendChild(backdropEl);
  }

  // Sheet panel
  const sheet = document.createElement("div");
  sheet.className = "sheet-panel";

  const translateDir = side === "bottom" ? "translateY(100%)" :
    side === "top" ? "translateY(-100%)" :
    side === "right" ? "translateX(100%)" :
    "translateX(-100%)";

  sheet.style.cssText =
    `position:relative;${dimProp}:${sizeValue};max-${dimProp}:${isVertical ? "100vh" : "100vw"};` +
    `background:#fff;${isVertical ? "max-height" : "max-width"}:${sizeValue};` +
    `transform:${translateDir};transition:transform ${animationDuration}ms cubic-bezier(0.32, 0.72, 0, 1);` +
    `box-shadow:${isVertical ? "0 -4px 24px rgba(0,0,0,0.12)" : "-4px 0 24px rgba(0,0,0,0.12)"};` +
    "display:flex;flex-direction:column;overflow:hidden;";

  // Header
  if (header) {
    const headerEl = document.createElement("div");
    headerEl.className = "sheet-header";
    headerEl.style.cssText = "padding:16px 20px;border-bottom:1px solid #f3f4f6;flex-shrink:0;";
    headerEl.innerHTML = typeof header === "string" ? header : "";
    if (typeof header !== "string") headerEl.appendChild(header);
    sheet.appendChild(headerEl);

    // Drag handle for bottom sheets
    if (dismissible && side === "bottom") {
      const handle = document.createElement("div");
      handle.className = "sheet-drag-handle";
      handle.style.cssText =
        "width:36px;height:4px;border-radius:2px;background:#d1d5db;margin:8px auto 0;cursor:grab;";
      headerEl.prepend(handle);
    }
  }

  // Content area
  const contentArea = document.createElement("div");
  contentArea.className = "sheet-content";
  contentArea.style.cssText = "flex:1;overflow-y:auto;padding:20px;";
  if (typeof content === "string") {
    contentArea.innerHTML = content;
  } else {
    contentArea.appendChild(content);
  }
  sheet.appendChild(contentArea);

  // Footer
  if (footer) {
    const footerEl = document.createElement("div");
    footerEl.className = "sheet-footer";
    footerEl.style.cssText = "padding:16px 20px;border-top:1px solid #f3f4f6;flex-shrink:0;";
    footerEl.innerHTML = typeof footer === "string" ? footer : "";
    if (typeof footer !== "string") footerEl.appendChild(footer);
    sheet.appendChild(footerEl);
  }

  wrapper.appendChild(sheet);
  document.body.appendChild(wrapper);

  // --- Methods ---

  function open(): void {
    if (_open) return;
    _open = true;
    wrapper.style.display = "flex";

    if (lockScroll) unlockScrollFn = _lockBody();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Animate in
        sheet.style.transform = _getSnapTransform(_currentSnap);
        if (backdropEl) backdropEl.style.opacity = "1";
      });
    });

    _setupListeners();
    onOpen?.();
  }

  function close(): void {
    if (!_open) return;
    _open = true; // Keep true during animation

    sheet.style.transform = translateDir;
    if (backdropEl) backdropEl.style.opacity = "0";

    setTimeout(() => {
      _open = false;
      wrapper.style.display = "none";
      _removeListeners();
      unlockScrollFn?.();
      unlockScrollFn = null;
      onClose?.();
    }, animationDuration);
  }

  function toggle(): void { _open ? close() : open(); }
  function isOpen(): boolean { return _open; }

  function snapTo(index: number): void {
    if (!snapPoints || index < 0 || index >= snapPoints.length) return;
    _currentSnap = index;
    sheet.style.transform = _getSnapTransform(index);
    onSnapChange?.(index);
  }

  function getCurrentSnap(): number { return _currentSnap; }

  function setContent(newContent: HTMLElement | string): void {
    contentArea.innerHTML = "";
    if (typeof newContent === "string") {
      contentArea.innerHTML = newContent;
    } else {
      contentArea.appendChild(newContent);
    }
  }

  function destroy(): void {
    if (_open) {
      _open = false;
      wrapper.style.display = "none";
      _removeListeners();
      unlockScrollFn?.();
    }
    wrapper.remove();
  }

  // --- Internal ---

  function _getSnapTransform(snapIndex: number): string {
    if (!snapPoints || !snapPoints[snapIndex]) return "translate(0, 0)";

    const fraction = snapPoints[snapIndex]!;
    if (side === "bottom") {
      const maxTranslate = parseFloat(sizeValue) || window.innerHeight * 0.5;
      return `translateY(${(1 - fraction) * maxTranslate}px)`;
    } else if (side === "top") {
      const maxTranslate = parseFloat(sizeValue) || window.innerHeight * 0.5;
      return `translateY(-${(1 - fraction) * maxTranslate}px)`;
    }
    return "translate(0, 0)";
  }

  function _setupListeners(): void {
    // Backdrop click
    if (backdrop && backdropDismiss && backdropEl) {
      backdropEl.addEventListener("click", close);
      cleanupFns.push(() => backdropEl!.removeEventListener("click", close));
    }

    // Escape
    if (escapeDismiss) {
      const escHandler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
      document.addEventListener("keydown", escHandler);
      cleanupFns.push(() => document.removeEventListener("keydown", escHandler));
    }

    // Drag to dismiss
    if (dismissible && (side === "bottom" || side === "top")) {
      const dragHandle = sheet.querySelector(".sheet-drag-handle") || sheet;

      const dragStart = (e: TouchEvent | MouseEvent): void => {
        isDragging = true;
        const point = "touches" in e ? e.touches[0]! : e;
        dragStartY = point.clientY;
        dragStartX = point.clientX;

        // Get current transform value
        const style = getComputedStyle(sheet);
        const transform = style.transform;
        if (transform !== "none") {
          const match = /translateY\(([-\d.]+)px\)/.exec(transform);
          sheetStartTransform = match ? parseFloat(match[1]) : 0;
        } else {
          sheetStartTransform = 0;
        }

        sheet.style.transition = "none";
      };

      const dragMove = (e: TouchEvent | MouseEvent): void => {
        if (!isDragging) return;
        const point = "touches" in e ? e.touches[0]! : e;
        const delta = side === "bottom"
          ? Math.max(0, point.clientY - dragStartY)
          : Math.min(0, point.clientY - dragStartY);

        const newTransform = sheetStartTransform + delta;
        sheet.style.transform = `translateY(${newTransform}px)`;

        // Calculate progress
        const maxDrag = parseFloat(sizeValue) || 400;
        const progress = Math.abs(newTransform) / maxDrag;
        onDrag?.(Math.min(progress, 1));

        e.preventDefault();
      };

      const dragEnd = (): void => {
        if (!isDragging) return;
        isDragging = false;
        sheet.style.transition = `transform ${animationDuration}ms cubic-bezier(0.32, 0.72, 0, 1)`;

        const style = getComputedStyle(sheet);
        const transform = style.transform;
        const match = transform !== "none" ? /translateY\(([-\d.]+)px\)/.exec(transform) : null;
        const currentOffset = match ? parseFloat(match[1]) : 0;

        if (Math.abs(currentOffset) > dismissThreshold) {
          close();
        } else {
          // Snap back
          sheet.style.transform = _getSnapTransform(_currentSnap);
          onDrag?.(0);
        }
      };

      dragHandle.addEventListener("touchstart", dragStart, { passive: true });
      dragHandle.addEventListener("touchmove", dragMove, { passive: false });
      dragHandle.addEventListener("touchend", dragEnd);
      dragHandle.addEventListener("mousedown", dragStart);
      document.addEventListener("mousemove", dragMove);
      document.addEventListener("mouseup", dragEnd);

      cleanupFns.push(() => {
        dragHandle.removeEventListener("touchstart", dragStart);
        dragHandle.removeEventListener("touchmove", dragMove);
        dragHandle.removeEventListener("touchend", dragEnd);
        dragHandle.removeEventListener("mousedown", dragStart);
        document.removeEventListener("mousemove", dragMove);
        document.removeEventListener("mouseup", dragEnd);
      });
    }
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return { el: wrapper, open, close, toggle, isOpen, snapTo, getCurrentSnap, setContent, destroy };
}

/** Simple body scroll lock helper */
function _lockBody(): () => void {
  const body = document.body;
  const originalOverflow = body.style.overflow;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  body.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    const pr = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${pr + scrollbarWidth}px`;
  }
  return () => {
    body.style.overflow = originalOverflow;
    body.style.paddingRight = "";
  };
}
