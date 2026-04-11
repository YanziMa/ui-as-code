/**
 * Drawer Layout: Application shell layout with collapsible side drawer,
 * header bar, content area, footer, responsive behavior, and
 * persistent state management.
 */

// --- Types ---

export type DrawerPosition = "left" | "right";
export type DrawerSize = number | "compact" | "full";

export interface DrawerLayoutOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Drawer position */
  position?: DrawerPosition;
  /** Drawer width (px), "compact" (~64px icon-only), or "full" */
  size?: DrawerSize;
  /** Initially open? (default: true) */
  defaultOpen?: boolean;
  /** Header content (string, HTML, or element) */
  header?: string | HTMLElement;
  /** Footer content */
  footer?: string | HTMLElement;
  /** Main content area element */
  content?: HTMLElement;
  /** Drawer content (sidebar nav etc.) */
  drawerContent?: HTMLElement;
  /** Show toggle button in header? */
  showToggle?: boolean;
  /** Toggle button label text */
  toggleLabel?: { open: string; close: string };
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Backdrop overlay when drawer is shown? */
  backdrop?: boolean;
  /** Breakpoint below which drawer auto-collapses to overlay mode */
  responsiveBreakpoint?: number;
  /** Persist open state in localStorage? */
  persistKey?: string;
  /** Callback on drawer open/close */
  onToggle?: (open: boolean) => void;
  /** Custom CSS class */
  className?: string;
}

export interface DrawerLayoutInstance {
  element: HTMLElement;
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setSize: (size: DrawerSize) => void;
  setDrawerContent: (content: HTMLElement) => void;
  setContent: (content: HTMLElement) => void;
  destroy: () => void;
}

// --- Config ---

const COMPACT_WIDTH = 64;

// --- Main Factory ---

export function createDrawerLayout(options: DrawerLayoutOptions): DrawerLayoutInstance {
  const opts = {
    position: options.position ?? "left",
    size: options.size ?? 260,
    defaultOpen: options.defaultOpen ?? true,
    showToggle: options.showToggle ?? true,
    toggleLabel: options.toggleLabel ?? { open: "Close sidebar", close: "Open sidebar" },
    animationDuration: options.animationDuration ?? 250,
    backdrop: options.backdrop ?? false,
    responsiveBreakpoint: options.responsiveBreakpoint ?? 768,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("DrawerLayout: container not found");

  // Load persisted state
  let isOpen = opts.defaultOpen;
  if (opts.persistKey) {
    try {
      const saved = localStorage.getItem(opts.persistKey);
      if (saved !== null) isOpen = saved === "true";
    } catch { /* ignore */ }
  }

  let destroyed = false;
  let isOverlay = false; // true when in responsive overlay mode

  // Root
  const root = document.createElement("div");
  root.className = `drawer-layout ${opts.className}`;
  root.style.cssText = `
    display:flex;width:100%;height:100%;overflow:hidden;
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;
    position:relative;
  `;
  container.appendChild(root);

  // Resolve actual width
  function getDrawerWidth(): number {
    if (opts.size === "compact") return COMPACT_WIDTH;
    if (opts.size === "full") return typeof window !== "undefined" ? window.innerWidth : 800;
    return typeof opts.size === "number" ? opts.size : 260;
  }

  const dw = getDrawerWidth();

  // Drawer panel
  const drawer = document.createElement("aside");
  drawer.className = "drawer-layout-drawer";
  drawer.style.cssText = `
    flex-shrink:0;display:flex;flex-direction:column;
    width:${dw}px;height:100%;
    background:#fff;border-right:${opts.position === "left" ? "1px solid #e5e7eb" : "none"};
    border-left:${opts.position === "right" ? "1px solid #e5e7eb" : "none"};
    transition:width ${opts.animationDuration}ms ease,
      transform ${opts.animationDuration}ms ease,
      opacity ${opts.animationDuration}ms ease;
    overflow:hidden;z-index:10;
    order:${opts.position === "right" ? 1 : -1};
  `;
  if (!isOpen && !isOverlay) {
    drawer.style.width = "0";
    drawer.style.opacity = "0";
  }
  root.appendChild(drawer);

  // Drawer content
  if (options.drawerContent) {
    drawer.appendChild(options.drawerContent);
  }

  // Main area wrapper
  const mainWrapper = document.createElement("div");
  mainWrapper.className = "drawer-layout-main";
  mainWrapper.style.cssText = `
    display:flex;flex-direction:column;flex:1;min-width:0;overflow:hidden;
    order:0;
  `;
  root.appendChild(mainWrapper);

  // Header
  let headerEl: HTMLElement | null = null;
  if (options.header) {
    headerEl = document.createElement("header");
    headerEl.className = "drawer-layout-header";
    headerEl.style.cssText = `
      display:flex;align-items:center;gap:12px;padding:0 16px;
      height:52px;border-bottom:1px solid #f0f0f0;flex-shrink:0;
    `;

    // Toggle button
    if (opts.showToggle) {
      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.innerHTML = isOpen ? "&laquo;" : "&raquo;";
      toggleBtn.title = isOpen ? opts.toggleLabel.open : opts.toggleLabel.close;
      toggleBtn.style.cssText = `
        width:32px;height:32px;border-radius:6px;border:none;background:none;
        cursor:pointer;font-size:16px;color:#374151;display:flex;
        align-items:center;justify-content:center;transition:background 0.15s;
        flex-shrink:0;
      `;
      toggleBtn.addEventListener("click", () => instance.toggle());
      toggleBtn.addEventListener("mouseenter", () => { toggleBtn.style.background = "#f3f4f6"; });
      toggleBtn.addEventListener("mouseleave", () => { toggleBtn.style.background = ""; });
      headerEl.appendChild(toggleBtn);
    }

    // Custom header content
    if (typeof options.header === "string") {
      headerEl.innerHTML += options.header;
    } else {
      headerEl.appendChild(options.header);
    }
    mainWrapper.appendChild(headerEl);
  }

  // Content area
  const contentArea = document.createElement("main");
  contentArea.className = "drawer-layout-content";
  contentArea.style.cssText = "flex:1;overflow:auto;";
  if (options.content) {
    contentArea.appendChild(options.content);
  }
  mainWrapper.appendChild(contentArea);

  // Footer
  if (options.footer) {
    const footerEl = document.createElement("footer");
    footerEl.className = "drawer-layout-footer";
    footerEl.style.cssText = `
      padding:12px 16px;border-top:1px solid #f0f0f0;flex-shrink:0;
    `;
    if (typeof options.footer === "string") {
      footerEl.textContent = options.footer;
    } else {
      footerEl.appendChild(options.footer);
    }
    mainWrapper.appendChild(footerEl);
  }

  // Backdrop for overlay mode
  let backdropEl: HTMLElement | null = null;
  if (opts.backdrop) {
    backdropEl = document.createElement("div");
    backdropEl.className = "drawer-layout-backdrop";
    backdropEl.style.cssText = `
      position:absolute;inset:0;background:rgba(0,0,0,0.3);z-index:5;
      opacity:0;pointer-events:none;transition:opacity ${opts.animationDuration}ms ease;
    `;
    root.insertBefore(backdropEl, drawer);
  }

  // Responsive handling
  const mql = window.matchMedia(`(max-width: ${opts.responsiveBreakpoint}px)`);
  function handleResponsive(e: MediaQueryListEvent | MediaQueryList): void {
    const isMobile = e.matches;
    if (isMobile && !isOverlay) {
      // Switch to overlay mode
      isOverlay = true;
      if (isOpen) {
        drawer.style.position = "absolute";
        drawer.style.top = "0";
        drawer.style.left = opts.position === "right" ? "auto" : "0";
        drawer.style.right = opts.position === "right" ? "0" : "auto";
        drawer.style.zIndex = "20";
        drawer.style.boxShadow = "-4px 0 24px rgba(0,0,0,0.12)";
        if (backdropEl) {
          backdropEl!.style.opacity = "1";
          backdropEl!.style.pointerEvents = "auto";
        }
      }
    } else if (!isMobile && isOverlay) {
      // Switch back to normal mode
      isOverlay = false;
      drawer.style.position = "";
      drawer.style.top = "";
      drawer.style.left = "";
      drawer.style.right = "";
      drawer.style.zIndex = "";
      drawer.style.boxShadow = "";
      if (backdropEl) {
        backdropEl!.style.opacity = "0";
        backdropEl!.style.pointerEvents = "none";
      }
      applyOpenState();
    }
  }
  mql.addEventListener("change", handleResponsive as EventListener);
  handleResponsive(mql);

  function applyOpenState(): void {
    const w = getDrawerWidth();
    if (isOpen) {
      drawer.style.width = `${w}px`;
      drawer.style.opacity = "1";
      if (backdropEl && isOverlay) {
        backdropEl!.style.opacity = "1";
        backdropEl!.style.pointerEvents = "auto";
      }
    } else {
      drawer.style.width = "0";
      drawer.style.opacity = "0";
      if (backdropEl) {
        backdropEl!.style.opacity = "0";
        backdropEl!.style.pointerEvents = "none";
      }
    }
  }

  // Click outside to close (overlay mode only)
  if (backdropEl) {
    backdropEl.addEventListener("click", () => {
      if (isOverlay && isOpen) instance.close();
    });
  }

  const instance: DrawerLayoutInstance = {
    element: root,

    isOpen() { return isOpen; },

    open() {
      if (isOpen || destroyed) return;
      isOpen = true;
      applyOpenState();
      saveState();
      updateToggleIcon();
      opts.onToggle?.(true);
    },

    close() {
      if (!isOpen || destroyed) return;
      isOpen = false;
      applyOpenState();
      saveState();
      updateToggleIcon();
      opts.onToggle?.(false);
    },

    toggle() {
      if (isOpen) instance.close();
      else instance.open();
    },

    setSize(size: DrawerSize) {
      opts.size = size;
      const w = getDrawerWidth();
      if (isOpen) drawer.style.width = `${w}px`;
      saveState();
    },

    setDrawerContent(content: HTMLElement) {
      drawer.innerHTML = "";
      drawer.appendChild(content);
    },

    setContent(content: HTMLElement) {
      contentArea.innerHTML = "";
      contentArea.appendChild(content);
    },

    destroy() {
      destroyed = true;
      mql.removeEventListener("change", handleResponsive as EventListener);
      root.remove();
    },
  };

  function updateToggleIcon(): void {
    const btn = headerEl?.querySelector("button");
    if (btn) {
      btn.innerHTML = isOpen ? "&laquo;" : "&raquo;";
      btn.title = isOpen ? opts.toggleLabel.open : opts.toggleLabel.close;
    }
  }

  function saveState(): void {
    if (opts.persistKey) {
      try { localStorage.setItem(opts.persistKey, String(isOpen)); } catch { /* ignore */ }
    }
  }

  return instance;
}
