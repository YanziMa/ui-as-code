/**
 * Lightweight Drawer: Slide-out panel from left/right/top/bottom with
 * overlay backdrop, size variants, header/footer slots, close on escape,
 * body scroll lock, and animation support.
 */

// --- Types ---

export type DrawerPlacement = "left" | "right" | "top" | "bottom";
export type DrawerSize = "sm" | "md" | "lg" | "xl" | "full";

export interface DrawerOptions {
  /** Container element or selector (default: document.body) */
  container?: HTMLElement | string;
  /** Title text */
  title?: string;
  /** Content (string or HTML element) */
  content?: string | HTMLElement;
  /** Placement direction */
  placement?: DrawerPlacement;
  /** Size variant */
  size?: DrawerSize;
  /** Show close button? */
  closable?: boolean;
  /** Close on overlay click? */
  maskClosable?: boolean;
  /** Close on Escape key? */
  keyboard?: boolean;
  /** Show header area? */
  showHeader?: boolean;
  /** Header extra content (e.g., action buttons) */
  headerExtra?: string | HTMLElement;
  /** Footer content */
  footer?: string | HTMLElement;
  /** Z-index */
  zIndex?: number;
  /** Animation duration (ms) */
  duration?: number;
  /** Custom CSS class for the drawer panel */
  className?: string;
  /** Callback when drawer opens */
  onOpen?: () => void;
  /** Callback when drawer closes */
  onClose?: () => void;
  /** Destroy after close? */
  destroyOnClose?: boolean;
}

export interface DrawerInstance {
  element: HTMLElement;
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
  setTitle: (title: string) => void;
  setContent: (content: string | HTMLElement) => void;
  setFooter: (footer: string | HTMLElement) => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_MAP: Record<DrawerPlacement, Record<DrawerSize, string>> = {
  left:   { sm: "280px", md: "380px", lg: "480px", xl: "600px", full: "100vw" },
  right:  { sm: "280px", md: "380px", lg: "480px", xl: "600px", full: "100vw" },
  top:    { sm: "30vh", md: "45vh", lg: "60vh", xl: "75vh", full: "100vh" },
  bottom: { sm: "30vh", md: "45vh", lg: "60vh", xl: "75vh", full: "100vh" },
};

// --- Main Factory ---

export function createDrawer(options: DrawerOptions): DrawerInstance {
  const opts = {
    container: options.container ?? document.body,
    title: options.title ?? "",
    placement: options.placement ?? "right",
    size: options.size ?? "md",
    closable: options.closable ?? true,
    maskClosable: options.maskClosable ?? true,
    keyboard: options.keyboard ?? true,
    showHeader: options.showHeader ?? true,
    zIndex: options.zIndex ?? 10000,
    duration: options.duration ?? 250,
    className: options.className ?? "",
    destroyOnClose: options.destroyOnClose ?? false,
  };

  const parent = typeof opts.container === "string"
    ? document.querySelector<HTMLElement>(opts.container)!
    : opts.container;

  if (!parent) throw new Error("Drawer: container not found");

  let destroyed = false;
  let isOpenState = false;

  // Overlay / mask
  const overlay = document.createElement("div");
  overlay.className = "drawer-overlay";
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.45);
    z-index:${opts.zIndex};display:none;opacity:0;
    transition:opacity ${opts.duration}ms ease;
  `;

  // Panel
  const panel = document.createElement("div");
  panel.className = `drawer-panel drawer-${opts.placement} ${opts.className}`;
  panel.setAttribute("role": "dialog");
  panel.setAttribute("aria-modal", "true");
  if (opts.title) panel.setAttribute("aria-label", opts.title);

  const sizeVal = SIZE_MAP[opts.placement][opts.size];

  const basePanelStyle = `
    position:fixed;z-index:${opts.zIndex + 1};
    background:#fff;font-family:-apple-system,sans-serif;
    display:flex;flex-direction:column;
    box-shadow:${opts.placement === "left" || opts.placement === "right"
      ? "-4px 0 24px rgba(0,0,0,0.15)"
      : "0 -4px 24px rgba(0,0,0,0.15)"};
    transition:transform ${opts.duration}ms ease, opacity ${opts.duration}ms ease;
  `;

  switch (opts.placement) {
    case "left":
      panel.style.cssText = `${basePanelStyle}left:0;top:0;bottom:0;width:${sizeVal};transform:translateX(-100%);`;
      break;
    case "right":
      panel.style.cssText = `${basePanelStyle}right:0;top:0;bottom:0;width:${sizeVal};transform:translateX(100%);`;
      break;
    case "top":
      panel.style.cssText = `${basePanelStyle}top:0;left:0;right:0;height:${sizeVal};max-height:100vh;transform:translateY(-100%);`;
      break;
    case "bottom":
      panel.style.cssText = `${basePanelStyle}bottom:0;left:0;right:0;height:${sizeVal};max-height:100vh;transform:translateY(100%);`;
      break;
  }

  // Header
  let headerEl: HTMLElement | null = null;
  let titleEl: HTMLSpanElement | null = null;

  if (opts.showHeader) {
    headerEl = document.createElement("div");
    headerEl.className = "drawer-header";
    headerEl.style.cssText = `
      display:flex;align-items:center;gap:12px;padding:16px 20px;
      border-bottom:1px solid #f0f0f0;flex-shrink:0;
    `;

    // Title
    titleEl = document.createElement("span");
    titleEl.className = "drawer-title";
    titleEl.textContent = opts.title;
    titleEl.style.cssText = "flex:1;font-size:15px;font-weight:600;color:#111827;";
    headerEl.appendChild(titleEl);

    // Header extra
    if (options.headerExtra) {
      const extraEl = document.createElement("div");
      extraEl.className = "drawer-header-extra";
      extraEl.style.cssText = "flex-shrink:0;display:flex;align-items:center;";
      if (typeof options.headerExtra === "string") {
        extraEl.innerHTML = options.headerExtra;
      } else {
        extraEl.appendChild(options.headerExtra);
      }
      headerEl.appendChild(extraEl);
    }

    // Close button
    if (opts.closable) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "drawer-close";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.innerHTML = "&times;";
      closeBtn.style.cssText = `
        flex-shrink:0;width:28px;height:28px;border-radius:6px;
        border:none;background:none;color:#9ca3af;font-size:18px;
        cursor:pointer;display:flex;align-items:center;justify-content:center;
        transition:all 0.15s;
      `;
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#f3f4f6"; closeBtn.style.color = "#374151"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; closeBtn.style.color = "#9ca3af"; });
      closeBtn.addEventListener("click", () => instance.close());
      headerEl.appendChild(closeBtn);
    }

    panel.appendChild(headerEl);
  }

  // Body
  const body = document.createElement("div");
  body.className = "drawer-body";
  body.style.cssText = `
    flex:1;overflow-y:auto;padding:20px;font-size:14px;color:#374151;line-height:1.6;
  `;
  if (options.content) {
    if (typeof options.content === "string") {
      body.innerHTML = options.content;
    } else {
      body.appendChild(options.content);
    }
  }
  panel.appendChild(body);

  // Footer
  let footerEl: HTMLElement | null = null;

  if (options.footer) {
    footerEl = document.createElement("div");
    footerEl.className = "drawer-footer";
    footerEl.style.cssText = `
      padding:12px 20px;border-top:1px solid #f0f0f0;display:flex;
      justify-content:flex-end;gap:8px;flex-shrink:0;
    `;
    if (typeof options.footer === "string") {
      footerEl.innerHTML = options.footer;
    } else {
      footerEl.appendChild(options.footer);
    }
    panel.appendChild(footerEl);
  }

  // Append to DOM
  document.body.appendChild(overlay);
  document.body.appendChild(panel);

  // Save original overflow
  let savedOverflow = "";

  function lockScroll(): void {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  function unlockScroll(): void {
    document.body.style.overflow = savedOverflow;
  }

  function doOpen(): void {
    if (isOpenState || destroyed) return;
    isOpenState = true;

    overlay.style.display = "block";
    panel.style.display = "flex";

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";

      switch (opts.placement) {
        case "left":   panel.style.transform = "translateX(0)"; break;
        case "right":  panel.style.transform = "translateX(0)"; break;
        case "top":    panel.style.transform = "translateY(0)"; break;
        case "bottom": panel.style.transform = "translateY(0)"; break;
      }
    });

    lockScroll();
    opts.onOpen?.();
  }

  function doClose(): void {
    if (!isOpenState || destroyed) return;
    isOpenState = false;

    overlay.style.opacity = "0";

    switch (opts.placement) {
      case "left":   panel.style.transform = "translateX(-100%)"; break;
      case "right":  panel.style.transform = "translateX(100%)"; break;
      case "top":    panel.style.transform = "translateY(-100%)"; break;
      case "bottom": panel.style.transform = "translateY(100%)"; break;
    }

    setTimeout(() => {
      overlay.style.display = "none";
      unlockScroll();
      opts.onClose?.();
      if (opts.destroyOnClose) instance.destroy();
    }, opts.duration);
  }

  // Event handlers

  // Overlay click
  overlay.addEventListener("click", () => {
    if (opts.maskClosable) doClose();
  });

  // Keyboard
  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape" && opts.keyboard) doClose();
  }
  document.addEventListener("keydown", handleKeydown);

  const instance: DrawerInstance = {
    element: panel,

    open: doOpen,
    close: doClose,

    isOpen() { return isOpenState; },

    setTitle(title: string) {
      if (titleEl) titleEl.textContent = title;
      if (opts.title !== title) opts.title = title;
      panel.setAttribute("aria-label", title);
    },

    setContent(content: string | HTMLElement) {
      body.innerHTML = "";
      if (typeof content === "string") {
        body.innerHTML = content;
      } else {
        body.appendChild(content);
      }
    },

    setFooter(footer: string | HTMLElement) {
      if (!footerEl) {
        footerEl = document.createElement("div");
        footerEl.className = "drawer-footer";
        footerEl.style.cssText = `
          padding:12px 20px;border-top:1px solid #f0f0f0;display:flex;
          justify-content:flex-end;gap:8px;flex-shrink:0;
        `;
        panel.appendChild(footerEl);
      }
      if (typeof footer === "string") {
        footerEl.innerHTML = footer;
      } else {
        footerEl.innerHTML = "";
        footerEl.appendChild(footer);
      }
    },

    destroy() {
      destroyed = true;
      document.removeEventListener("keydown", handleKeydown);
      overlay.remove();
      panel.remove();
      unlockScroll();
    },
  };

  return instance;
}
