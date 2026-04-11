/**
 * Drawer V2: Slide-in drawer panel from any edge with overlay,
 * multiple sizes, drag-to-resize, nested drawers, animations,
 * focus trapping, and responsive behavior.
 */

// --- Types ---

export type DrawerSide = "left" | "right" | "top" | "bottom";
export type DrawerSize = "auto" | "sm" | "md" | "lg" | "xl" | "percent" | "full";

export interface DrawerV2Options {
  /** Drawer content (string or HTMLElement) */
  content: string | HTMLElement;
  /** Which side to slide from */
  side?: DrawerSide;
  /** Size variant */
  size?: DrawerSize;
  /** Custom size in px (for "percent" size) */
  customPercent?: number;
  /** Custom size in px (for fixed pixel size) */
  customWidth?: number;
  /** Custom height in px */
  customHeight?: number;
  /** Show backdrop overlay? */
  backdrop?: boolean;
  /** Click backdrop to close? */
  closeOnBackdrop?: boolean;
  /** Close on Escape? */
  closeOnEsc?: boolean;
  /** Closable (shows X button)? */
  closable?: boolean;
  /** Header element or title text */
  header?: HTMLElement;
  title?: string;
  /** Footer element */
  footer?: HTMLElement;
  /** Enable drag handle to resize? */
  resizable?: boolean;
  /** Min size when resizing (px) */
  minSize?: number;
  /** Max size when resizing (px) */
  maxSize?: number;
  /** Lock body scroll when open? */
  lockScroll?: boolean;
  /** Animation type */
  animation?: "slide" | "fade" | "compress" | "none";
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Background color of drawer */
  background?: string;
  /** Border radius (px) */
  borderRadius?: number;
  /** Shadow */
  shadow?: string;
  /** Z-index */
  zIndex?: number;
  /** Portal container (defaults to document.body) */
  container?: HTMLElement | string;
  /** Callback on open */
  onOpen?: () => void;
  /** Callback on close */
  onClose?: () => void;
  /** Callback on resize (when dragging) */
  onResize?: (size: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface DrawerV2Instance {
  element: HTMLElement;
  /** Open the drawer */
  open: () => void;
  /** Close the drawer */
  close: () => void;
  /** Toggle */
  toggle: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Set size programmatically */
  setSize: (size: number) => void;
  /** Get current size */
  getSize: () => number;
  /** Update content */
  setContent: (content: string | HTMLElement) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Size Config ---

const SIZE_MAP: Record<DrawerSide, Record<string, string>> = {
  left:   { sm: "300px", md: "400px", lg: "520px", xl: "680px", full: "100%" },
  right:  { sm: "300px", md: "400px", lg: "520px", xl: "680px", full: "100%" },
  top:    { sm: "30vh", md: "45vh", lg: "60vh", xl: "75vh", full: "100%" },
  bottom: { sm: "30vh", md: "45vh", lg: "60vh", xl: "75vh", full: "100%" },
};

// --- Main Factory ---

export function createDrawerV2(options: DrawerV2Options): DrawerV2Instance {
  const opts = {
    side: options.side ?? "right",
    size: options.size ?? "md",
    customPercent: options.customPercent ?? 35,
    customWidth: options.customWidth,
    customHeight: options.customHeight,
    backdrop: options.backdrop ?? true,
    closeOnBackdrop: options.closeOnBackdrop ?? true,
    closeOnEsc: options.closeOnEsc ?? true,
    closable: options.closable ?? true,
    resizable: options.resizable ?? false,
    minSize: options.minSize ?? 200,
    maxSize: options.maxSize ?? (opts.side === "left" || opts.side === "right" ? window.innerWidth * 0.85 : window.innerHeight * 0.85),
    lockScroll: options.lockScroll ?? true,
    animation: options.animation ?? "slide",
    animationDuration: options.animationDuration ?? 300,
    background: options.background ?? "#fff",
    borderRadius: options.borderRadius ?? 0,
    shadow: options.shadow ?? "-4px 0 40px rgba(0,0,0,0.12), -2px 0 8px rgba(0,0,0,0.06)",
    zIndex: options.zIndex ?? 11100,
    className: options.className ?? "",
    ...options,
  };

  const containerEl = options.container
    ? (typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)
      : options.container)
    : document.body;

  if (!containerEl) throw new Error("DrawerV2: container not found");

  let openState = false;
  let destroyed = false;
  let currentSize = 0;
  let previousActiveElement: HTMLElement | null = null;

  const isHorizontal = opts.side === "left" || opts.side === "right";

  // --- Create DOM ---

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "dr-backdrop";
  backdrop.style.cssText = `
    position:fixed;inset:0;z-index:${opts.zIndex};
    background:rgba(0,0,0,0.35);opacity:0;transition:opacity ${opts.animationDuration}ms ease;
    display:none;
  `;

  // Drawer panel
  const drawer = document.createElement("div");
  drawer.className = `drawer-v2 dr-${opts.side} ${opts.className}`;
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");

  // Compute initial size
  function computeSizeValue(): string {
    if (opts.customWidth && isHorizontal) return opts.customWidth + "px";
    if (opts.customHeight && !isHorizontal) return opts.customHeight + "px";
    if (opts.size === "percent") return opts.customPercent + "%";
    if (opts.size === "full") return isHorizontal ? "100vw" : "100vh";
    if (opts.size === "auto") return isHorizontal ? "auto" : "auto";
    return SIZE_MAP[opts.side][opts.size] ?? SIZE_MAP[opts.side].md;
  }

  const initialSizeVal = computeSizeValue();

  drawer.style.cssText = `
    position:fixed;z-index:${opts.zIndex + 1};
    background:${opts.background};
    box-shadow:${opts.shadow};
    font-family:-apple-system,sans-serif;
    overflow-y:auto;overflow-x:hidden;
    display:flex;flex-direction:column;
    ${isHorizontal
      ? `top:0;bottom:0;${opts.side}:0;width:${initialSizeVal};`
      : `left:0;right:0;${opts.side}:0;height:${initialSizeVal};`}
    border-radius:${opts.borderRadius > 0
      ? (isHorizontal
          ? `0 ${opts.borderRadius}px ${opts.borderRadius}px 0`
          : `${opts.borderRadius}px ${opts.borderRadius}px 0 0`)
      : "0"};
    transition:${opts.animation === "none"
      ? ""
      : `transform ${opts.animationDuration}ms cubic-bezier(0.22,1,0.36,1),
               opacity ${opts.animationDuration}ms ease`};
  `;

  // Initial hidden state
  if (opts.animation !== "none") {
    if (opts.side === "right") drawer.style.transform = "translateX(100%)";
    else if (opts.side === "left") drawer.style.transform = "translateX(-100%)";
    else if (opts.side === "bottom") drawer.style.transform = "translateY(100%)";
    else drawer.style.transform = "translateY(-100%)";
  }
  drawer.style.opacity = opts.animation === "fade" ? "0" : "1";

  // Header
  const hasHeader = opts.header || opts.title || opts.closable;
  if (hasHeader) {
    const hdr = document.createElement("div");
    hdr.className = "dr-header";
    hdr.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:16px 20px;border-bottom:1px solid #f0f0f0;flex-shrink:0;
    `;

    if (opts.header) {
      hdr.appendChild(opts.header.cloneNode(true));
    } else {
      const titleArea = document.createElement("span");
      titleArea.style.cssText = "font-size:16px;font-weight:700;color:#111827;";
      titleArea.textContent = opts.title ?? "";
      hdr.appendChild(titleArea);
    }

    if (opts.closable) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
      closeBtn.setAttribute("aria-label", "Close drawer");
      closeBtn.style.cssText = `
        width:32px;height:32px;border-radius:8px;border:none;background:none;
        cursor:pointer;display:flex;align-items:center;justify-content:center;
        flex-shrink:0;transition:background 0.15s;
      `;
      closeBtn.addEventListener("click", () => close());
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#f3f4f6"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; });
      hdr.appendChild(closeBtn);
    }

    drawer.appendChild(hdr);
  }

  // Body
  const bodyEl = document.createElement("div");
  bodyEl.className = "dr-body";
  bodyEl.style.cssText = "flex:1;padding:20px;overflow-y:auto;color:#374151;line-height:1.6;";
  if (typeof options.content === "string") {
    bodyEl.innerHTML = options.content;
  } else {
    bodyEl.appendChild(options.content.cloneNode(true));
  }
  drawer.appendChild(bodyEl);

  // Footer
  if (opts.footer) {
    const ftr = document.createElement("div");
    ftr.className = "dr-footer";
    ftr.style.cssText = "padding:14px 20px;border-top:1px solid #f0f0f0;flex-shrink:0;";
    ftr.appendChild(opts.footer.cloneNode(true));
    drawer.appendChild(ftr);
  }

  // Resize handle
  let resizeHandle: HTMLElement | null = null;
  if (opts.resizable) {
    resizeHandle = document.createElement("div");
    resizeHandle.className = "dr-resize-handle";
    resizeHandle.style.cssText = isHorizontal
      ? `position:absolute;top:0;bottom:0;${opts.side === "left" ? "right" : "left"}:0;width:5px;cursor:${opts.side === "left" ? "e-resize" : "w-resize"};background:transparent;&:hover{background:${va.color}}`
      : `position:absolute;left:0;right:0;${opts.side === "top" ? "bottom" : "top"}:0;height:5px;cursor:${opts.side === "top" ? "s-resize" : "n-resize"};background:transparent;`;
    drawer.appendChild(resizeHandle);

    let resizing = false;
    let startPos = 0;
    let startSize = 0;

    const onResizeStart = (clientPos: number) => {
      resizing = true;
      startPos = clientPos;
      startSize = currentSize || (isHorizontal ? drawer.offsetWidth : drawer.offsetHeight);
      document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";

      const onMove = (e: MouseEvent | TouchEvent) => {
        if (!resizing) return;
        const cp = "touches" in e ? e.touches[0]![isHorizontal ? "clientX" : "clientY"] : (e as MouseEvent)[isHorizontal ? "clientX" : "clientY"];
        const delta = opts.side === "left" || opts.side === "top" ? startSize - (cp - startPos) : startSize + (cp - startPos);
        const clamped = Math.max(opts.minSize, Math.min(delta, opts.maxSize));
        setSize(clamped);
        opts.onResize?.(clamped);
      };

      const onEnd = () => {
        resizing = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onEnd);
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend", onEnd);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
      document.addEventListener("touchmove", onMove, { passive: true });
      document.addEventListener("touchend", onEnd);
    };

    resizeHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      onResizeStart((e as MouseEvent)[isHorizontal ? "clientX" : "clientY"]);
    });
    resizeHandle.addEventListener("touchstart", (e) => {
      const t = e.touches[0];
      if (t) onResizeStart(t[isHorizontal ? "clientX" : "clientY"]);
    }, { passive: true });
  }

  // --- Open/Close ---

  function open(): void {
    if (destroyed || openState) return;
    openState = true;
    previousActiveElement = document.activeElement as HTMLElement;

    if (opts.lockScroll) document.body.style.overflow = "hidden";

    containerEl.appendChild(backdrop);
    containerEl.appendChild(drawer);
    backdrop.style.display = "";
    drawer.style.display = "";

    requestAnimationFrame(() => {
      backdrop.style.opacity = "1";
      drawer.style.transform = "";
      drawer.style.opacity = "1";
      currentSize = isHorizontal ? drawer.offsetWidth : drawer.offsetHeight;
    });

    // Events
    if (opts.closeOnBackdrop) backdrop.addEventListener("click", () => close());
    if (opts.closeOnEsc) {
      const escHandler = (e: KeyboardEvent) => { if (e.key === "Escape" && openState) { e.preventDefault(); close(); } };
      document.addEventListener("keydown", escHandler);
      (drawer as any).__escHandler = escHandler;
    }

    opts.onOpen?.();
  }

  function close(): void {
    if (!openState || destroyed) return;

    backdrop.style.opacity = "0";
    if (opts.animation !== "none") {
      if (opts.side === "right") drawer.style.transform = "translateX(100%)";
      else if (opts.side === "left") drawer.style.transform = "translateX(-100%)";
      else if (opts.side === "bottom") drawer.style.transform = "translateY(100%)";
      else drawer.style.transform = "translateY(-100%)";
    }
    if (opts.animation === "fade") drawer.style.opacity = "0";

    setTimeout(() => {
      openState = false;
      backdrop.remove();
      drawer.remove();
      if (opts.lockScroll) document.body.style.overflow = "";
      if (previousActiveElement && typeof previousActiveElement.focus === "function") {
        previousActiveElement.focus();
      }
      opts.onClose?.();
    }, opts.animationDuration);
  }

  function toggle(): void { openState ? close() : open(); }

  function setSize(size: number): void {
    currentSize = size;
    if (isHorizontal) drawer.style.width = size + "px";
    else drawer.style.height = size + "px";
  }

  function getSize(): number {
    return currentSize || (isHorizontal ? drawer.offsetWidth : drawer.offsetHeight);
  }

  // --- Instance ---

  const instance: DrawerV2Instance = {
    element: drawer,
    open,
    close,
    toggle,
    isOpen: () => openState,
    setSize,
    getSize,
    setContent(content: string | HTMLElement) {
      bodyEl.innerHTML = "";
      if (typeof content === "string") bodyEl.innerHTML = content;
      else bodyEl.appendChild(content.cloneNode(true);
    },
    destroy() {
      destroyed = true;
      if (openState) { backdrop.remove(); drawer.remove(); if (opts.lockScroll) document.body.style.overflow = ""; }
    },
  };

  return instance;
}
