/**
 * Drawer / Side Panel: Slide-in panel from left/right/bottom/top with
 * backdrop, size variants, header/body/footer slots, keyboard close,
 * focus trap, drag-to-resize (for side drawers), and animations.
 */

// --- Types ---

export type DrawerSide = "left" | "right" | "bottom" | "top";
export type DrawerSize = "sm" | "md" | "lg" | "xl" | "full" | number;

export interface DrawerOptions {
  /** Container to render into (default: document.body) */
  container?: HTMLElement;
  /** Which side the drawer slides from */
  side?: DrawerSide;
  /** Size variant or pixel width/height */
  size?: DrawerSize;
  /** Title text */
  title?: string;
  /** Body content */
  body: string | HTMLElement;
  /** Footer content */
  footer?: string | HTMLElement;
  /** Show close button? */
  closable?: boolean;
  /** Close on backdrop click? */
  closeOnBackdrop?: boolean;
  /** Close on Escape key? */
  closeOnEscape?: boolean;
  /** Show backdrop overlay? */
  showBackdrop?: boolean;
  /** Backdrop color */
  backdropColor?: string;
  /** Z-index */
  zIndex?: number;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Allow dragging the edge to resize? */
  resizable?: boolean;
  /** Lock body scroll when open? */
  lockScroll?: boolean;
  /** Callback on open */
  onOpen?: () => void;
  /** Callback on close */
  onClose?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface DrawerInstance {
  element: HTMLDivElement;
  backdrop: HTMLDivElement;
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
  setBody: (content: string | HTMLElement) => void;
  setTitle: (title: string) => void;
  setFooter: (content: string | HTMLElement) => void;
  setSize: (size: DrawerSize) => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_MAP: Record<string, { value: string; unit: "px" | "%" | "vw" }> = {
  sm:   { value: "300", unit: "px" },
  md:   { value: "400", unit: "px" },
  lg:   { value: "560", unit: "px" },
  xl:   { value: "720", unit: "px" },
  full: { value: "100", unit: "%" },
};

function resolveSize(size: DrawerSize, side: DrawerSide): { cssValue: string } {
  if (typeof size === "number") return { cssValue: `${size}px` };
  const s = SIZE_MAP[size] ?? SIZE_MAP.md!;
  const isHorizontal = side === "left" || side === "right";
  return { cssValue: `${s.value}${isHorizontal ? s.unit : (s.unit === "vw" ? "vh" : s.unit === "%" ? "%" : "px")}` };
}

// --- Main Factory ---

export function createDrawer(options: DrawerOptions): DrawerInstance {
  const opts = {
    container: options.container ?? document.body,
    side: options.side ?? "right",
    size: options.size ?? "md",
    closable: options.closable ?? true,
    closeOnBackdrop: options.closeOnBackdrop ?? true,
    closeOnEscape: options.closeOnEscape ?? true,
    showBackdrop: options.showBackdrop ?? true,
    backdropColor: options.backdropColor ?? "rgba(0,0,0,0.4)",
    zIndex: options.zIndex ?? 10000,
    animationDuration: options.animationDuration ?? 250,
    resizable: options.resizable ?? false,
    lockScroll: options.lockScroll ?? true,
    className: options.className ?? "",
    ...options,
  };

  const isHorizontal = opts.side === "left" || opts.side === "right";

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "drawer-backdrop";
  backdrop.style.cssText = `
    position:fixed;inset:0;background:${opts.backdropColor};
    z-index:${opts.zIndex};display:none;opacity:0;
    transition:opacity ${opts.animationDuration}ms ease;
  `;

  // Drawer panel
  const panel = document.createElement("div");
  panel.className = `drawer drawer-${opts.side} ${opts.className}`;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.style.cssText = `
    position:fixed;z-index:${opts.zIndex + 1};
    background:#fff;display:flex;flex-direction:column;
    font-family:-apple-system,sans-serif;color:#374151;
    height:${isHorizontal ? "100%" : "auto"};
    max-height:100vh;
    transition:transform ${opts.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow:${opts.side === "left" ? "-8px 0 30px rgba(0,0,0,0.12)" :
      opts.side === "right" ? "8px 0 30px rgba(0,0,0,0.12)" :
      opts.side === "bottom" ? "0 -8px 30px rgba(0,0,0,0.12)" :
      "0 8px 30px rgba(0,0,0,0.12)"};
  `;

  // Apply initial position (off-screen)
  applySize(opts.size);
  applyPosition(false);

  // Header
  let titleEl: HTMLElement | null = null;
  if (opts.title || opts.closable) {
    const header = document.createElement("div");
    header.className = "drawer-header";
    header.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:16px 20px;border-bottom:1px solid #f0f0f0;flex-shrink:0;
      min-height:56px;
    `;

    if (opts.title) {
      titleEl = document.createElement("h2");
      titleEl.className = "drawer-title";
      titleEl.style.cssText = "font-size:16px;font-weight:600;color:#111827;margin:0;";
      titleEl.textContent = opts.title;
      header.appendChild(titleEl);
    } else {
      header.appendChild(document.createElement("span"));
    }

    // Close button
    if (opts.closable) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "&times;";
      closeBtn.setAttribute("aria-label", "Close drawer");
      closeBtn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:20px;line-height:1;
        color:#9ca3af;padding:4px 6px;border-radius:6px;transition:all 0.15s;
        flex-shrink:0;
      `;
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#f3f4f6"; closeBtn.style.color = "#374151"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; closeBtn.style.color = "#9ca3af"; });
      closeBtn.addEventListener("click", () => instance.close());
      header.appendChild(closeBtn);
    }

    panel.appendChild(header);
  }

  // Body
  let bodyContainer = document.createElement("div");
  bodyContainer.className = "drawer-body";
  bodyContainer.style.cssText = "flex:1;overflow-y:auto;padding:20px;";
  setBodyContent(bodyContainer, opts.body);
  panel.appendChild(bodyContainer);

  // Footer
  let footerContainer: HTMLElement | null = null;
  if (opts.footer !== undefined) {
    footerContainer = document.createElement("div");
    footerContainer.className = "drawer-footer";
    footerContainer.style.cssText = `
      display:flex;align-items:center;justify-content:flex-end;gap:8px;
      padding:14px 20px;border-top:1px solid #f0f0f0;flex-shrink:0;
    `;
    setFooterContent(footerContainer, opts.footer);
    panel.appendChild(footerContainer);
  }

  // Resize handle
  let resizeHandle: HTMLDivElement | null = null;
  if (opts.resizable && isHorizontal) {
    resizeHandle = document.createElement("div");
    resizeHandle.className = "drawer-resize-handle";
    const isLeft = opts.side === "left";
    resizeHandle.style.cssText = `
      position:absolute;top:0;${isLeft ? "right" : "left"}:-4px;
      width:4px;height:100%;cursor:col-resize;z-index:10;
      transition:background 0.15s;
    `;
    resizeHandle.addEventListener("mouseenter", () => { resizeHandle!.style.background = "#4338ca"; });
    resizeHandle.addEventListener("mouseleave", () => { resizeHandle!.style.background = ""; });

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizeHandle.addEventListener("pointerdown", (e: PointerEvent) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = panel.offsetWidth;
      resizeHandle!.setPointerCapture(e.pointerId);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    });

    resizeHandle.addEventListener("pointermove", (e: PointerEvent) => {
      if (!isResizing) return;
      const delta = isLeft ? startX - e.clientX : e.clientX - startX;
      const newWidth = Math.max(200, Math.min(startWidth + delta, window.innerWidth * 0.9));
      panel.style.width = `${newWidth}px`;
    });

    resizeHandle.addEventListener("pointerup", () => {
      isResizing = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    });

    panel.appendChild(resizeHandle);
  }

  opts.container.appendChild(backdrop);
  opts.container.appendChild(panel);

  // State
  let isOpenState = false;
  let previousFocus: HTMLElement | null = null;

  function setBodyContent(container: HTMLElement, content: string | HTMLElement): void {
    container.innerHTML = "";
    if (typeof content === "string") {
      container.innerHTML = content;
    } else {
      container.appendChild(content);
    }
  }

  function setFooterContent(container: HTMLElement, content: string | HTMLElement): void {
    container.innerHTML = "";
    if (typeof content === "string") {
      container.innerHTML = content;
    } else {
      container.appendChild(content);
    }
  }

  function applySize(size: DrawerSize): void {
    const resolved = resolveSize(size, opts.side);
    if (isHorizontal) {
      panel.style.width = resolved.cssValue;
    } else {
      panel.style.height = resolved.cssValue;
    }
  }

  function applyPosition(visible: boolean): void {
    switch (opts.side) {
      case "left":
        panel.style.left = visible ? "0" : `-${resolveSize(opts.size).cssValue}`;
        panel.style.top = "0"; panel.style.bottom = "0";
        break;
      case "right":
        panel.style.right = visible ? "0" : `-${resolveSize(opts.size).cssValue}`;
        panel.style.top = "0"; panel.style.bottom = "0";
        break;
      case "top":
        panel.style.top = visible ? "0" : `-${resolveSize(opts.size).cssValue}`;
        panel.style.left = "0"; panel.style.right = "0"; panel.style.width = "100%";
        break;
      case "bottom":
        panel.style.bottom = visible ? "0" : `-${resolveSize(opts.size).cssValue}`;
        panel.style.left = "0"; panel.style.right = "0"; panel.style.width = "100%";
        break;
    }
  }

  // Focus trap
  function trapFocus(e: KeyboardEvent): void {
    if (e.key !== "Tab" || !isOpenState) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  }

  // Event handlers
  if (opts.closeOnBackdrop) {
    backdrop.addEventListener("click", () => instance.close());
  }

  if (opts.closeOnEscape) {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpenState) instance.close();
    };
    document.addEventListener("keydown", escHandler);
    (backdrop as any)._escHandler = escHandler;
  }

  document.addEventListener("keydown", trapFocus);

  const instance: DrawerInstance = {
    element: panel,
    backdrop,

    open() {
      if (isOpenState) return;
      isOpenState = true;
      previousFocus = document.activeElement as HTMLElement;

      backdrop.style.display = "block";
      void backdrop.offsetHeight;
      backdrop.style.opacity = "1";
      applyPosition(true);

      if (opts.lockScroll) document.body.style.overflow = "hidden";

      const firstFocusable = panel.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();

      opts.onOpen?.();
    },

    close() {
      if (!isOpenState) return;
      isOpenState = false;

      backdrop.style.opacity = "0";
      applyPosition(false);

      setTimeout(() => {
        backdrop.style.display = "none";
        if (opts.lockScroll) document.body.style.overflow = "";
        if (previousFocus) previousFocus.focus();
      }, opts.animationDuration);

      opts.onClose?.();
    },

    isOpen() { return isOpenState; },

    setBody(content: string | HTMLElement) {
      setBodyContent(bodyContainer, content);
    },

    setTitle(title: string) {
      if (titleEl) titleEl.textContent = title;
    },

    setFooter(content: string | HTMLElement) {
      if (footerContainer) setFooterContent(footerContainer, content);
    },

    setSize(size: DrawerSize) {
      opts.size = size;
      applySize(size);
      if (isOpenState) applyPosition(true);
    },

    destroy() {
      if (isOpenState) {
        if (opts.lockScroll) document.body.style.overflow = "";
        if (previousFocus) previousFocus.focus();
      }
      document.removeEventListener("keydown", trapFocus);
      const escH = (backdrop as any)._escHandler;
      if (escH) document.removeEventListener("keydown", escH);
      backdrop.remove();
      panel.remove();
    },
  };

  return instance;
}
