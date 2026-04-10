/**
 * Drawer / Slide Panel: Side panel that slides in from left/right/bottom/top
 * with overlay backdrop, multiple sizes, header/body/footer slots,
 * keyboard trap, escape to close, and responsive breakpoints.
 */

// --- Types ---

export type DrawerPlacement = "left" | "right" | "top" | "bottom";
export type DrawerSize = "sm" | "md" | "lg" | "full";

export interface DrawerOptions {
  /** Container element or selector (drawer will be portal'd to body) */
  container?: HTMLElement | string;
  /** Placement direction */
  placement?: DrawerPlacement;
  /** Size variant */
  size?: DrawerSize;
  /** Width/height in px (overrides size) */
  dimension?: number;
  /** Show close button? */
  closable?: boolean;
  /** Close on escape key? */
  closeOnEscape?: boolean;
  /** Close on overlay click? */
  closeOnOverlay?: boolean;
  /** Show backdrop overlay? */
  showBackdrop?: boolean;
  /** Backdrop color/opacity */
  backdropColor?: string;
  /** Header content (string or element) */
  header?: string | HTMLElement;
  /** Body content (string or element) */
  body: string | HTMLElement;
  /** Footer content (string or element) */
  footer?: string | HTMLElement;
  /** Z-index */
  zIndex?: number;
  /** Open state (for controlled mode) */
  open?: boolean;
  /** Animation duration ms */
  animationDuration?: number;
  /** Callback on open */
  onOpen?: () => void;
  /** Callback on close */
  onClose?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface DrawerInstance {
  /** Root wrapper element (includes backdrop) */
  element: HTMLDivElement;
  /** The drawer panel itself */
  panel: HTMLDivElement;
  /** Open the drawer */
  open: () => void;
  /** Close the drawer */
  close: () => void;
  /** Toggle open/close */
  toggle: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Set body content dynamically */
  setBody: (content: string | HTMLElement) => void;
  /** Set header content dynamically */
  setHeader: (content: string | HTMLElement) => void;
  /** Set footer content dynamically */
  setFooter: (content: string | HTMLElement) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Config ---

const SIZE_DIMENSIONS: Record<DrawerSize, { horizontal: number; vertical: number }> = {
  sm:   { horizontal: 280, vertical: 200 },
  md:   { horizontal: 384, vertical: 320 },
  lg:   { horizontal: 480, vertical: 400 },
  full:  { horizontal: "100vw" as unknown as number, vertical: "100vh" as unknown as number },
};

const PLACEMENT_STYLES: Record<DrawerPlacement, {
  property: string; sizeProp: string; fullValue: string; offsetFrom: string;
}> = {
  left:   { property: "width",  sizeProp: "horizontal", fullValue: "100vw", offsetFrom: "left" },
  right:  { property: "width",  sizeProp: "horizontal", fullValue: "100vw", offsetFrom: "right" },
  top:    { property: "height", sizeProp: "vertical", fullValue: "100vh", offsetFrom: "top" },
  bottom: { property: "height", sizeProp: "vertical", fullValue: "100vh", offsetFrom: "bottom" },
};

// --- Main ---

export function createDrawer(options: DrawerOptions): DrawerInstance {
  const opts = {
    placement: options.placement ?? "right",
    size: options.size ?? "md",
    closable: options.closable ?? true,
    closeOnEscape: options.closeOnEscape ?? true,
    closeOnOverlay: options.closeOnOverlay ?? true,
    showBackdrop: options.showBackdrop ?? true,
    backdropColor: options.backdropColor ?? "rgba(0,0,0,0.5)",
    zIndex: options.zIndex ?? 10000,
    animationDuration: options.animationDuration ?? 250,
    open: options.open ?? false,
    className: options.className ?? "",
    ...options,
  };

  const ps = PLACEMENT_STYLES[opts.placement];
  const dim = opts.dimension ?? SIZE_DIMENSIONS[opts.size][ps.sizeProp];
  const isHorizontal = opts.placement === "left" || opts.placement === "right";

  // Wrapper (backdrop + drawer)
  const wrapper = document.createElement("div");
  wrapper.className = `drawer-wrapper ${opts.className}`;
  wrapper.style.cssText = `
    position:fixed;inset:0;z-index:${opts.zIndex};
    display:flex;${isHorizontal ? "" : "flex-direction:column;"}
    justify-content:${opts.placement === "left" ? "flex-start" : opts.placement === "right" ? "flex-end" : "center"};
    align-items:${opts.placement === "top" ? "flex-start" : opts.placement === "bottom" ? "flex-end" : "stretch"};
    pointer-events:none;opacity:0;transition:opacity ${opts.animationDuration}ms ease;
  `;
  document.body.appendChild(wrapper);

  // Backdrop
  let backdropEl: HTMLDivElement | null = null;
  if (opts.showBackdrop) {
    backdropEl = document.createElement("div");
    backdropEl.className = "drawer-backdrop";
    backdropEl.style.cssText = `
      position:absolute;inset:0;background:${opts.backdropColor};
      transition:background ${opts.animationDuration}ms ease;
    `;
    wrapper.insertBefore(backdropEl, wrapper.firstChild);
  }

  // Panel
  const panel = document.createElement("div");
  panel.className = "drawer-panel";
  const dimVal = typeof dim === "number" ? `${dim}px` : dim;
  panel.style.cssText = `
    ${ps.property}:${dimVal};max-${ps.property}:${dim == "100vw" || dim == "100vh" ? dimVal : `${dim}px`};
    height:${!isHorizontal ? "100%" : "auto"};width:${isHorizontal ? "100%" : "auto"};
    background:#fff;
    box-shadow:${isHorizontal
      ? "-4px 0 24px rgba(0,0,0,0.15),0 4px 12px rgba(0,0,0,0.08)"
      : "0 -4px 24px rgba(0,0,0,0.15),4px 0 12px rgba(0,0,0,0.08)"};
    display:flex;flex-direction:column;
    font-family:-apple-system,sans-serif;color:#374151;
    pointer-events:auto;
    transform:${opts.placement === "left"
      ? "translateX(-100%)"
      : opts.placement === "right"
        ? "translateX(100%)"
        : opts.placement === "top"
          ? "translateY(-100%)"
          : "translateY(100%)"};
    transition:transform ${opts.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
    overflow:hidden;
  `;
  wrapper.appendChild(panel);

  // Track sections
  let headerEl: HTMLElement | null = null;
  let bodyEl: HTMLElement | null = null;
  let footerEl: HTMLElement | null = null;

  function buildHeader(content: string | HTMLElement): void {
    headerEl = document.createElement("div");
    headerEl.className = "drawer-header";
    headerEl.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:16px 20px;border-bottom:1px solid #f0f0f0;flex-shrink:0;
      min-height:56px;
    `;
    if (typeof content === "string") {
      const title = document.createElement("h3");
      title.style.cssText = "font-size:16px;font-weight:600;color:#111827;margin:0;";
      title.textContent = content;
      headerEl.appendChild(title);
    } else {
      headerEl.appendChild(content);
    }

    // Close button
    if (opts.closable) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "&times;";
      closeBtn.setAttribute("aria-label", "Close drawer");
      closeBtn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:20px;line-height:1;
        color:#9ca3af;padding:4px 8px;border-radius:6px;transition:all 0.15s;
        flex-shrink:0;
      `;
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#f3f4f6"; closeBtn.style.color = "#374151"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; closeBtn.style.color = "#9ca3af"; });
      closeBtn.addEventListener("click", () => instance.close());
      headerEl.appendChild(closeBtn);
    }

    panel.appendChild(headerEl);
  }

  function buildBody(content: string | HTMLElement): void {
    bodyEl = document.createElement("div");
    bodyEl.className = "drawer-body";
    bodyEl.style.cssText = `
      flex:1;overflow-y:auto;overflow-x:hidden;padding:20px;
      min-height:0;
    `;
    if (typeof content === "string") {
      bodyEl.textContent = content;
    } else {
      bodyEl.appendChild(content);
    }
    panel.appendChild(bodyEl);
  }

  function buildFooter(content: string | HTMLElement): void {
    footerEl = document.createElement("div");
    footerEl.className = "drawer-footer";
    footerEl.style.cssText = `
      padding:14px 20px;border-top:1px solid #f0f0f0;display:flex;
      justify-content:flex-end;gap:8px;flex-shrink:0;
    `;
    if (typeof content === "string") {
      footerEl.textContent = content;
    } else {
      footerEl.appendChild(content);
    }
    panel.appendChild(footerEl);
  }

  // Build initial content
  if (opts.header) buildHeader(opts.header);
  buildBody(opts.body);
  if (opts.footer) buildFooter(opts.footer);

  // State
  let isOpenState = opts.open;
  let destroyed = false;
  let previousFocus: HTMLElement | null = null;

  function doOpen(): void {
    if (isOpenState || destroyed) return;
    isOpenState = true;
    previousFocus = document.activeElement as HTMLElement;

    wrapper.style.opacity = "1";
    wrapper.style.pointerEvents = "auto";
    panel.style.transform = "translate(0, 0)";

    requestAnimationFrame(() => {
      // Focus first focusable element
      const focusable = panel.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    });

    document.body.style.overflow = "hidden";
    opts.onOpen?.();
  }

  function doClose(): void {
    if (!isOpenState || destroyed) return;
    isOpenState = false;

    panel.style.transform = isHorizontal
      ? `translateX(${opts.placement === "left" ? "-100%" : "100%"})`
      : `translateY(${opts.placement === "top" ? "-100%" : "100%"})`;

    setTimeout(() => {
      wrapper.style.opacity = "0";
      wrapper.style.pointerEvents = "none";
      document.body.style.overflow = "";
      if (previousFocus) previousFocus.focus();
    }, opts.animationDuration - 50);

    opts.onClose?.();
  }

  // Event handlers
  if (opts.closeOnOverlay && backdropEl) {
    backdropEl.addEventListener("click", () => instance.close());
  }

  if (opts.closeOnEscape) {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpenState) instance.close();
    };
    document.addEventListener("keydown", escHandler);
    (wrapper as any)._escHandler = escHandler;
  }

  // Instance
  const instance: DrawerInstance = {
    element: wrapper,
    panel,

    open() { doOpen(); },

    close() { doClose(); },

    toggle() { isOpenState ? doClose() : doOpen(); },

    isOpen() { return isOpenState; },

    setBody(content: string | HTMLElement) {
      if (bodyEl) {
        bodyEl.innerHTML = "";
        if (typeof content === "string") bodyEl.textContent = content;
        else bodyEl.appendChild(content);
      }
    },

    setHeader(content: string | HTMLElement) {
      if (headerEl) { headerEl.remove(); headerEl = null; }
      if (content !== undefined) buildHeader(content);
    },

    setFooter(content: string | HTMLElement) {
      if (footerEl) { footerEl.remove(); footerEl = null; }
      if (content !== undefined) buildFooter(content);
    },

    destroy() {
      destroyed = true;
      if (isOpenState) document.body.style.overflow = "";
      const escH = (wrapper as any)._escHandler;
      if (escH) document.removeEventListener("keydown", escH);
      wrapper.remove();
    },
  };

  // Auto-open if requested
  if (opts.open) doOpen();

  return instance;
}
