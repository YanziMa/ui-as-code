/**
 * Off-canvas Panel: Bootstrap-style offcanvas sidebar with push/push-overlay/overlay
 * modes, responsive breakpoints, body scroll locking, backdrop, animations,
 * and keyboard accessibility.
 */

// --- Types ---

export type OffcanvasSide = "start" | "end" | "top" | "bottom";
export type OffcanvasMode = "overlay" | "push" | "push-overlay";
export type OffcanvasResponsive = boolean | string; // false = always visible, true = auto, or breakpoint like 'lg'

export interface OffcanvasOptions {
  /** Body content (string, HTML string, or HTMLElement) */
  body: string | HTMLElement;
  /** Title text */
  title?: string;
  /** Which side the panel appears from */
  side?: OffcanvasSide;
  /** Display mode */
  mode?: OffcanvasMode;
  /** Width for side panels (CSS value) */
  width?: string;
  /** Height for top/bottom panels */
  height?: string;
  /** Show close button? */
  closable?: boolean;
  /** Show backdrop overlay? */
  backdrop?: boolean;
  /** Backdrop color */
  backdropColor?: string;
  /** Scroll lock when open */
  scrollLock?: boolean;
  /** Enable body scrolling behind panel in overlay mode */
  bodyScroll?: boolean;
  /** Z-index */
  zIndex?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Edge offset (px) — distance from viewport edge */
  edgeOffset?: number;
  /** Callback on open */
  onOpen?: () => void;
  /** Callback on close */
  onClose?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface OffcanvasInstance {
  element: HTMLDivElement;
  backdrop: HTMLDivElement | null;
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setBody: (content: string | HTMLElement) => void;
  destroy: () => void;
}

// --- Main Factory ---

export function createOffcanvas(options: OffcanvasOptions): OffcanvasInstance {
  const opts = {
    side: options.side ?? "start",
    mode: options.mode ?? "overlay",
    width: options.width ?? "320px",
    height: options.height ?? "auto",
    closable: options.closable ?? true,
    backdrop: options.backdrop ?? true,
    backdropColor: options.backdropColor ?? "rgba(0,0,0,0.5)",
    scrollLock: options.scrollLock ?? true,
    bodyScroll: options.bodyScroll ?? false,
    zIndex: options.zIndex ?? 1040,
    animationDuration: options.animationDuration ?? 300,
    edgeOffset: options.edgeOffset ?? 0,
    className: options.className ?? "",
    ...options,
  };

  const isHorizontal = opts.side === "start" || opts.side === "end";
  const isStartOrEnd = isHorizontal;

  // Backdrop element
  let backdropEl: HTMLDivElement | null = null;
  if (opts.backdrop && opts.mode !== "push") {
    backdropEl = document.createElement("div");
    backdropEl.className = "offcanvas-backdrop";
    backdropEl.style.cssText = `
      position:fixed;inset:0;background:${opts.backdropColor};
      z-index:${opts.zIndex};display:none;opacity:0;
      transition:opacity ${opts.animationDuration}ms ease;
      pointer-events:none;
    `;
    if (opts.mode === "push-overlay") {
      backdropEl.style.pointerEvents = "auto";
    }
    document.body.appendChild(backdropEl);
  }

  // Panel element
  const panel = document.createElement("div");
  panel.className = `offcanvas offcanvas-${opts.side} ${opts.className}`;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", String(opts.mode !== "push"));
  panel.setAttribute("aria-label", opts.title ?? "Off-canvas panel");

  const dimVal = isHorizontal ? opts.width : opts.height;

  panel.style.cssText = `
    position:fixed;z-index:${opts.zIndex + 1};
    background:#fff;display:flex;flex-direction:column;
    font-family:-apple-system,sans-serif;color:#374151;
    ${isHorizontal ? `top:0;bottom:0;width:${dimVal};` : `left:0;right:0;height:${dimVal};`}
    max-height:100vh;overflow:hidden;
    box-shadow:${opts.side === "end" || opts.side === "right" ? "-4px 0 20px rgba(0,0,0,0.15)" :
      opts.side === "start" || opts.side === "left" ? "4px 0 20px rgba(0,0,0,0.15)" :
      opts.side === "bottom" ? "0 -4px 20px rgba(0,0,0,0.15)" :
      "0 4px 20px rgba(0,0,0,0.15)"};
    transition:transform ${opts.animationDuration}ms ease-in-out,
      opacity ${opts.animationDuration}ms ease;
    visibility:hidden;
    ${getHiddenTransform(opts.side)}
  `;

  // Header
  let titleEl: HTMLHeadingElement | null = null;
  const header = document.createElement("div");
  header.className = "offcanvas-header";
  header.style.cssText = `
    display:flex;align-items:center;justify-content:space-between;
    padding:14px 16px;border-bottom:1px solid #e9ecef;flex-shrink:0;
  `;

  if (opts.title) {
    titleEl = document.createElement("h5");
    titleEl.className = "offcanvas-title";
    titleEl.style.cssText = "font-size:16px;font-weight:600;color:#212529;margin:0;";
    titleEl.textContent = opts.title;
    header.appendChild(titleEl);
  } else {
    header.appendChild(document.createElement("span"));
  }

  if (opts.closable) {
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "offcanvas-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "&times;";
    closeBtn.style.cssText = `
      background:none;border:none;font-size:24px;line-height:1;
      font-weight:700;color:#6c757d;padding:2px 6px;border-radius:4px;
      cursor:pointer;transition:color 0.15s;flex-shrink:0;
    `;
    closeBtn.addEventListener("mouseenter", () => { closeBtn.style.color = "#343a40"; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn.style.color = "#6c757d"; });
    closeBtn.addEventListener("click", () => instance.close());
    header.appendChild(closeBtn);
  }

  panel.appendChild(header);

  // Body
  const bodyContainer = document.createElement("div");
  bodyContainer.className = "offcanvas-body";
  bodyContainer.style.cssText = "flex:1;overflow-y:auto;padding:16px;overscroll-behavior:contain;";
  setBodyContent(bodyContainer, opts.body);
  panel.appendChild(bodyContainer);

  // Append to DOM
  document.body.appendChild(panel);

  // State
  let isOpenState = false;
  let previousFocus: HTMLElement | null = null;
  let originalBodyPaddingRight = "";

  function setBodyContent(container: HTMLElement, content: string | HTMLElement): void {
    container.innerHTML = "";
    if (typeof content === "string") {
      container.innerHTML = content;
    } else {
      container.appendChild(content);
    }
  }

  function doOpen(): void {
    if (isOpenState) return;
    isOpenState = true;
    previousFocus = document.activeElement as HTMLElement;

    panel.style.visibility = "visible";

    // Show backdrop
    if (backdropEl) {
      backdropEl.style.display = "block";
      void backdropEl.offsetHeight;
      backdropEl.style.opacity = "1";
    }

    // Animate panel in
    void panel.offsetHeight;
    panel.style.opacity = "1";
    panel.style.transform = getVisibleTransform(opts.side);

    // Push mode: shift main content
    if (opts.mode === "push" || opts.mode === "push-overlay") {
      const shiftAmount = isHorizontal
        ? (opts.side === "start" || opts.side === "left" ? parseInt(dimVal) : -parseInt(dimVal))
        : (opts.side === "top" ? parseInt(dimVal) : -parseInt(dimVal));
      document.body.style.transform = `translateX(${isHorizontal ? shiftAmount : 0}px) translateY(${isHorizontal ? 0 : shiftAmount}px)`;
      document.body.style.transition = `transform ${opts.animationDuration}ms ease-in-out`;
    }

    // Scroll lock
    if (opts.scrollLock) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        originalBodyPaddingRight = document.body.style.paddingRight || "";
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      if (!opts.bodyScroll) {
        document.body.style.overflow = "hidden";
      }
    }

    opts.onOpen?.();
  }

  function doClose(): void {
    if (!isOpenState) return;
    isOpenState = false;

    // Animate out
    panel.style.opacity = "0";
    panel.style.transform = getHiddenTransform(opts.side);

    if (backdropEl) {
      backdropEl.style.opacity = "0";
    }

    setTimeout(() => {
      panel.style.visibility = "hidden";

      if (backdropEl) {
        backdropEl.style.display = "none";
      }

      // Reset body transform (push mode)
      if (opts.mode === "push" || opts.mode === "push-overlay") {
        document.body.style.transform = "";
        document.body.style.transition = "";
      }

      // Restore scroll
      if (opts.scrollLock) {
        document.body.style.paddingRight = originalBodyPaddingRight;
        if (!opts.bodyScroll) {
          document.body.style.overflow = "";
        }
      }

      if (previousFocus) previousFocus.focus();
    }, opts.animationDuration);

    opts.onClose?.();
  }

  // Event bindings

  if (backdropEl && opts.mode !== "push") {
    backdropEl.addEventListener("click", () => doClose());
  }

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpenState) doClose();
  };
  document.addEventListener("keydown", escHandler);

  // Instance
  const instance: OffcanvasInstance = {
    element: panel,
    backdrop: backdropEl,

    isOpen() { return isOpenState; },

    open: doOpen,

    close: doClose,

    toggle() { isOpenState ? doClose() : doOpen(); },

    setBody(content: string | HTMLElement) {
      setBodyContent(bodyContainer, content);
    },

    destroy() {
      if (isOpenState) {
        if (opts.scrollLock) {
          document.body.style.paddingRight = originalBodyPaddingRight;
          document.body.style.overflow = "";
          document.body.style.transform = "";
        }
        if (previousFocus) previousFocus.focus();
      }
      document.removeEventListener("keydown", escHandler);
      backdropEl?.remove();
      panel.remove();
    },
  };

  return instance;
}

// --- Helpers ---

function getHiddenTransform(side: OffcanvasSide): string {
  switch (side) {
    case "start":
    case "left":   return "translateX(-100%)";
    case "end":
    case "right":  return "translateX(100%)";
    case "top":    return "translateY(-100%)";
    case "bottom": return "translateY(100%)";
  }
}

function getVisibleTransform(side: OffcanvasSide): string {
  return "translateX(0)";
}

// --- Quick Helper ---

/** Create an offcanvas and bind it to a trigger button */
export function bindOffcanvas(
  trigger: HTMLElement | string,
  options: OffcanvasOptions,
): OffcanvasInstance {
  const el = typeof trigger === "string"
    ? document.querySelector<HTMLElement>(trigger)!
    : trigger;

  const oc = createOffcanvas(options);
  el.addEventListener("click", () => oc.toggle());
  return oc;
}
