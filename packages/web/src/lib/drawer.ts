/**
 * Drawer: Slide-out panel from left/right/bottom/top with backdrop,
 * header/body/footer slots, size variants, animations, focus trap,
 * keyboard navigation, and lock-body-scroll.
 */

// --- Types ---

export type DrawerSide = "left" | "right" | "top" | "bottom";
export type DrawerSize = "sm" | "md" | "lg" | "xl" | "full";

export interface DrawerOptions {
  /** Body content (string, HTML string, or HTMLElement) */
  body: string | HTMLElement;
  /** Title text */
  title?: string;
  /** Footer content */
  footer?: string | HTMLElement;
  /** Which side slides in */
  side?: DrawerSide;
  /** Size variant */
  size?: DrawerSize;
  /** Show close button? */
  closable?: boolean;
  /** Close on backdrop click? */
  closeOnBackdrop?: boolean;
  /** Close on Escape key? */
  closeOnEscape?: boolean;
  /** Show backdrop overlay? */
  showBackdrop?: boolean;
  /** Backdrop color/opacity */
  backdropColor?: string;
  /** Custom width/height (overrides size) */
  dimension?: string;
  /** Z-index */
  zIndex?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Lock body scroll when open */
  lockScroll?: boolean;
  /** Callback on open */
  onOpen?: () => void;
  /** Callback on close */
  onClose?: () => void;
  /** Custom CSS class for the drawer panel */
  className?: string;
}

export interface DrawerInstance {
  element: HTMLDivElement;
  backdrop: HTMLDivElement;
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
  setBody: (content: string | HTMLElement) => void;
  setTitle: (title: string) => void;
  setFooter: (content: string | HTMLElement) => void;
  destroy: () => void;
}

// --- Size Config ---

const SIZE_MAP: Record<DrawerSize, { value: string }> = {
  sm:   { value: "320px" },
  md:   { value: "400px" },
  lg:   { value: "560px" },
  xl:   { value: "720px" },
  full: { value: "100%" },
};

// --- Main Factory ---

export function createDrawer(options: DrawerOptions): DrawerInstance {
  const opts = {
    side: options.side ?? "right",
    size: options.size ?? "md",
    closable: options.closable ?? true,
    closeOnBackdrop: options.closeOnBackdrop ?? true,
    closeOnEscape: options.closeOnEscape ?? true,
    showBackdrop: options.showBackdrop ?? true,
    backdropColor: options.backdropColor ?? "rgba(0,0,0,0.45)",
    zIndex: options.zIndex ?? 10000,
    animationDuration: options.animationDuration ?? 250,
    lockScroll: options.lockScroll ?? true,
    className: options.className ?? "",
    ...options,
  };

  const sz = SIZE_MAP[opts.size];
  const isHorizontal = opts.side === "left" || opts.side === "right";
  const dimProp = isHorizontal ? "width" : "height";

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "drawer-backdrop";
  backdrop.style.cssText = `
    position:fixed;inset:0;background:${opts.showBackdrop ? opts.backdropColor : "transparent"};
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
    ${isHorizontal ? "top:0;bottom:0;" : "left:0;right:0;"}
    ${dimProp}:${opts.dimension ?? sz.value};
    max-${isHorizontal ? "width" : "height"}:100vw;
    max-height:100vh;overflow:hidden;
    box-shadow:${opts.side === "right" ? "-8px 0 30px rgba(0,0,0,0.12)" :
      opts.side === "left" ? "8px 0 30px rgba(0,0,0,0.12)" :
      opts.side === "bottom" ? "0 -8px 30px rgba(0,0,0,0.12)" :
      "0 8px 30px rgba(0,0,0,0.12)"};
    transition:transform ${opts.animationDuration}ms cubic-bezier(.4,0,.2,1),
      opacity ${opts.animationDuration}ms ease;
    opacity:0;
    ${getInitialTransform(opts.side)}
  `;

  // Header
  let titleEl: HTMLHeadingElement | null = null;
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

    if (opts.closable) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "drawer-close";
      closeBtn.setAttribute("aria-label", "Close drawer");
      closeBtn.innerHTML = "&times;";
      closeBtn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:20px;line-height:1;
        color:#9ca3af;padding:6px;border-radius:6px;transition:all 0.15s;
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
  let bodyContainer: HTMLDivElement;
  bodyContainer = document.createElement("div");
  bodyContainer.className = "drawer-body";
  bodyContainer.style.cssText = "flex:1;overflow-y:auto;padding:20px;";
  setBodyContent(bodyContainer, opts.body);
  panel.appendChild(bodyContainer);

  // Footer
  let footerContainer: HTMLDivElement | null = null;
  if (options.footer !== undefined) {
    footerContainer = document.createElement("div");
    footerContainer.className = "drawer-footer";
    footerContainer.style.cssText = `
      display:flex;align-items:center;justify-content:flex-end;gap:8px;
      padding:14px 20px;border-top:1px solid #f0f0f0;flex-shrink:0;
    `;
    setFooterContent(footerContainer, options.footer);
    panel.appendChild(footerContainer);
  }

  // Append to DOM
  document.body.appendChild(backdrop);
  document.body.appendChild(panel);

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

  // Focus trap
  function trapFocus(e: KeyboardEvent): void {
    if (e.key !== "Tab" || !isOpenState) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function doOpen(): void {
    if (isOpenState) return;
    isOpenState = true;
    previousFocus = document.activeElement as HTMLElement;

    backdrop.style.display = "block";
    void backdrop.offsetHeight; // force reflow
    backdrop.style.opacity = "1";
    panel.style.opacity = "1";
    panel.style.transform = getVisibleTransform(opts.side);

    if (opts.lockScroll) document.body.style.overflow = "hidden";

    // Focus first focusable element
    const firstFocusable = panel.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    opts.onOpen?.();
  }

  function doClose(): void {
    if (!isOpenState) return;
    isOpenState = false;

    backdrop.style.opacity = "0";
    panel.style.opacity = "0";
    panel.style.transform = getInitialTransform(opts.side);

    setTimeout(() => {
      backdrop.style.display = "none";
      if (opts.lockScroll) document.body.style.overflow = "";
      if (previousFocus) previousFocus.focus();
    }, opts.animationDuration);

    opts.onClose?.();
  }

  // Event bindings

  if (opts.closeOnBackdrop && opts.showBackdrop) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) doClose();
    });
  }

  if (opts.closeOnEscape) {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpenState) doClose();
    };
    document.addEventListener("keydown", escHandler);
    (backdrop as any)._escHandler = escHandler;
  }

  document.addEventListener("keydown", trapFocus);

  // Instance
  const instance: DrawerInstance = {
    element: panel,
    backdrop,

    isOpen() { return isOpenState; },

    open: doOpen,

    close: doClose,

    setBody(content: string | HTMLElement) {
      setBodyContent(bodyContainer, content);
    },

    setTitle(title: string) {
      if (titleEl) titleEl.textContent = title;
    },

    setFooter(content: string | HTMLElement) {
      if (footerContainer) setFooterContent(footerContainer, content);
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

// --- Helpers ---

function getInitialTransform(side: DrawerSide): string {
  switch (side) {
    case "left":   return "translateX(-100%)";
    case "right":  return "translateX(100%)";
    case "top":    return "translateY(-100%)";
    case "bottom": return "translateY(100%)";
  }
}

function getVisibleTransform(side: DrawerSide): string {
  switch (side) {
    case "left":
    case "right":  return "translateX(0)";
    case "top":
    case "bottom": return "translateY(0)";
  }
}
