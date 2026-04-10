/**
 * Bottom Sheet: Mobile-style bottom sheet with drag handle, snap points,
 * backdrop, header/body/footer, swipe-to-dismiss, and animations.
 */

// --- Types ---

export type SheetSnapPoint = "peek" | "half" | "full" | number;

export interface SheetOptions {
  /** Container (default: document.body) */
  container?: HTMLElement;
  /** Body content */
  body: string | HTMLElement;
  /** Title text */
  title?: string;
  /** Footer content */
  footer?: string | HTMLElement;
  /** Snap point(s) - can be array for multi-snap or single value */
  snap?: SheetSnapPoint | SheetSnapPoint[];
  /** Initial snap (default: "half") */
  initialSnap?: SheetSnapPoint;
  /** Show drag handle? */
  handle?: boolean;
  /** Show close button? */
  closable?: boolean;
  /** Close on backdrop tap? */
  closeOnBackdrop?: boolean;
  /** Dismiss on downward swipe past threshold? */
  dismissOnSwipe?: boolean;
  /** Backdrop color */
  backdropColor?: string;
  /** Z-index */
  zIndex?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Corner radius */
  borderRadius?: number;
  /** Lock body scroll when open */
  lockScroll?: boolean;
  /** Callback on open */
  onOpen?: () => void;
  /** Callback on close */
  onClose?: () => void;
  /** Callback on snap change */
  onSnapChange?: (snap: SheetSnapPoint) => void;
  /** Custom CSS class */
  className?: string;
}

export interface SheetInstance {
  element: HTMLDivElement;
  backdrop: HTMLDivElement;
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
  setBody: (content: string | HTMLElement) => void;
  snapTo: (point: SheetSnapPoint) => void;
  destroy: () => void;
}

// --- Config ---

const SNAP_VALUES: Record<string, number> = {
  peek: 0.25,
  half: 0.5,
  full: 1,
};

function resolveSnapHeight(snap: SheetSnapPoint, viewportH: number): number {
  if (typeof snap === "number") return Math.min(snap, viewportH);
  const ratio = SNAP_VALUES[snap] ?? SNAP_VALUES.half!;
  return viewportH * ratio;
}

// --- Main Factory ---

export function createSheet(options: SheetOptions): SheetInstance {
  const opts = {
    container: options.container ?? document.body,
    snap: options.snap ?? ["peek", "half", "full"],
    initialSnap: options.initialSnap ?? "half",
    handle: options.handle ?? true,
    closable: options.closable ?? true,
    closeOnBackdrop: options.closeOnBackdrop ?? true,
    dismissOnSwipe: options.dismissOnSwipe ?? true,
    backdropColor: options.backdropColor ?? "rgba(0,0,0,0.4)",
    zIndex: options.zIndex ?? 10000,
    animationDuration: options.animationDuration ?? 300,
    borderRadius: options.borderRadius ?? 16,
    lockScroll: options.lockScroll ?? true,
    className: options.className ?? "",
    ...options,
  };

  const snaps = Array.isArray(opts.snap) ? opts.snap : [opts.snap];
  let currentSnap = opts.initialSnap;

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  backdrop.style.cssText = `
    position:fixed;inset:0;background:${opts.backdropColor};
    z-index:${opts.zIndex};display:none;opacity:0;
    transition:opacity ${opts.animationDuration}ms ease;
  `;

  // Sheet panel
  const panel = document.createElement("div");
  panel.className = `sheet ${opts.className}`;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.style.cssText = `
    position:fixed;left:0;right:0;z-index:${opts.zIndex + 1};
    background:#fff;display:flex;flex-direction:column;
    font-family:-apple-system,sans-serif;color:#374151;
    border-radius:${opts.borderRadius}px ${opts.borderRadius}px 0 0;
    max-height:100vh;overflow:hidden;
    transition:transform ${opts.animationDuration}ms cubic-bezier(0.32, 0.72, 0, 1);
    transform:translateY(100%);
  `;

  // Drag handle bar
  if (opts.handle) {
    const handleBar = document.createElement("div");
    handleBar.className = "sheet-handle";
    handleBar.style.cssText = `
      display:flex;justify-content:center;padding:8px 0 4px;cursor:grab;flex-shrink:0;
      touch-action:none;-webkit-user-select:none;user-select:none;
    `;
    const handleInner = document.createElement("div");
    handleInner.style.cssText = "width:36px;height:4px;border-radius:2px;background:#d1d5db;";
    handleBar.appendChild(handleInner);
    panel.appendChild(handleBar);

    // Drag behavior
    let isDragging = false;
    let startY = 0;
    let startTransform = 0;

    function getTranslateY(): number {
      const style = panel.style.transform;
      const match = style.match(/translateY\(([-\d.]+)px\)/);
      return match ? parseFloat(match[1]!) : window.innerHeight;
    }

    handleBar.addEventListener("pointerdown", (e: PointerEvent) => {
      isDragging = true;
      startY = e.clientY;
      startTransform = getTranslateY();
      handleBar.setPointerCapture(e.pointerId);
      handleBar.style.cursor = "grabbing";
    });

    handleBar.addEventListener("pointermove", (e: PointerEvent) => {
      if (!isDragging) return;
      const delta = e.clientY - startY;
      const newT = startTransform + delta;
      if (newT >= 0) { // Only allow dragging down from current position
        panel.style.transition = "none";
        panel.style.transform = `translateY(${newT}px)`;
        // Dim backdrop based on position
        const progress = 1 - newT / window.innerHeight;
        backdrop.style.opacity = String(Math.max(0, Math.min(0.5, progress * 0.5)));
      }
    });

    handleBar.addEventListener("pointerup", (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      handleBar.releasePointerCapture(e.pointerId);
      handleBar.style.cursor = "grab";
      panel.style.transition = `transform ${opts.animationDuration}ms cubic-bezier(0.32, 0.72, 0, 1)`;

      const endY = getTranslateY();
      const viewportH = window.innerHeight;
      const ratio = 1 - endY / viewportH;

      if (opts.dismissOnSwipe && ratio < 0.15) {
        instance.close();
        return;
      }

      // Find nearest snap
      let nearest = snaps[0]!;
      let minDist = Infinity;
      for (const s of snaps) {
        const targetH = resolveSnapHeight(s, viewportH);
        const dist = Math.abs(endY - (viewportH - targetH));
        if (dist < minDist) { minDist = dist; nearest = s; }
      }

      snapToInternal(nearest);
    });
  }

  // Header
  let titleEl: HTMLElement | null = null;
  if (opts.title || opts.closable) {
    const header = document.createElement("div");
    header.className = "sheet-header";
    header.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:4px 20px 12px;flex-shrink:0;
    `;
    if (opts.title) {
      titleEl = document.createElement("h3");
      titleEl.style.cssText = "font-size:16px;font-weight:600;color:#111827;margin:0;";
      titleEl.textContent = opts.title;
      header.appendChild(titleEl);
    } else {
      header.appendChild(document.createElement("span"));
    }
    if (opts.closable) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "&times;";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.style.cssText = "background:none;border:none;font-size:18px;color:#9ca3af;cursor:pointer;padding:4px;border-radius:6px;";
      closeBtn.addEventListener("click", () => instance.close());
      header.appendChild(closeBtn);
    }
    panel.appendChild(header);
  }

  // Body
  let bodyContainer = document.createElement("div");
  bodyContainer.className = "sheet-body";
  bodyContainer.style.cssText = "flex:1;overflow-y:auto;padding:4px 20px 20px;";
  if (typeof opts.body === "string") bodyContainer.innerHTML = opts.body;
  else bodyContainer.appendChild(opts.body);
  panel.appendChild(bodyContainer);

  // Footer
  let footerContainer: HTMLElement | null = null;
  if (options.footer !== undefined) {
    footerContainer = document.createElement("div");
    footerContainer.className = "sheet-footer";
    footerContainer.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 20px;border-top:1px solid #f0f0f0;flex-shrink:0;";
    if (typeof options.footer === "string") footerContainer.innerHTML = options.footer;
    else footerContainer.appendChild(options.footer);
    panel.appendChild(footerContainer);
  }

  opts.container.appendChild(backdrop);
  opts.container.appendChild(panel);

  // State
  let isOpenState = false;
  let previousFocus: HTMLElement | null = null;

  function snapToInternal(snap: SheetSnapPoint): void {
    currentSnap = snap;
    const h = resolveSnapHeight(snap, window.innerHeight);
    panel.style.transform = `translateY(${window.innerHeight - h}px)`;
    opts.onSnapChange?.(snap);
  }

  // Event handlers
  if (opts.closeOnBackdrop) {
    backdrop.addEventListener("click", () => instance.close());
  }

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpenState) instance.close();
  };
  document.addEventListener("keydown", escHandler);

  const instance: SheetInstance = {
    element: panel,
    backdrop,

    open() {
      if (isOpenState) return;
      isOpenState = true;
      previousFocus = document.activeElement as HTMLElement;

      backdrop.style.display = "block";
      void backdrop.offsetHeight;
      backdrop.style.opacity = "1";

      snapToInternal(currentSnap);

      if (opts.lockScroll) document.body.style.overflow = "hidden";
      const firstFocusable = panel.querySelector<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])');
      firstFocusable?.focus();
      opts.onOpen?.();
    },

    close() {
      if (!isOpenState) return;
      isOpenState = false;

      panel.style.transform = "translateY(100%)";
      backdrop.style.opacity = "0";

      setTimeout(() => {
        backdrop.style.display = "none";
        if (opts.lockScroll) document.body.style.overflow = "";
        if (previousFocus) previousFocus.focus();
      }, opts.animationDuration);

      opts.onClose?.();
    },

    isOpen() { return isOpenState; },

    setBody(content: string | HTMLElement) {
      bodyContainer.innerHTML = "";
      if (typeof content === "string") bodyContainer.innerHTML = content;
      else bodyContainer.appendChild(content);
    },

    snapTo(point: SheetSnapPoint) {
      if (!snaps.includes(point)) return;
      snapToInternal(point);
    },

    destroy() {
      if (isOpenState) {
        if (opts.lockScroll) document.body.style.overflow = "";
        if (previousFocus) previousFocus.focus();
      }
      document.removeEventListener("keydown", escHandler);
      backdrop.remove();
      panel.remove();
    },
  };

  return instance;
}
