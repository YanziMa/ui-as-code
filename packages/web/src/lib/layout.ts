/**
 * Layout System: Full-page layout with header, sidebar, content, and footer regions.
 * Supports fixed/static positioning, responsive breakpoints, collapsible sidebar,
 * multiple layout modes (sidebar-right, top-nav, full-width), and dark mode.
 */

// --- Types ---

export type LayoutMode = "sidebar" | "top-nav" | "full-width" | "mixed";
export type SidebarPosition = "left" | "right";

export interface LayoutRegion {
  /** Region identifier */
  id: "header" | "sidebar" | "content" | "footer";
  /** Content: string HTML or HTMLElement */
  content?: string | HTMLElement;
  /** Fixed/sticky positioning? */
  fixed?: boolean;
  /** Height for header/footer (CSS value) */
  height?: string;
  /** Width for sidebar (CSS value) */
  width?: string;
  /** Background color */
  background?: string;
  /** Custom CSS class */
  className?: string;
}

export interface LayoutOptions {
  /** Container element or selector (usually document.body or a root div) */
  container: HTMLElement | string;
  /** Layout mode */
  mode?: LayoutMode;
  /** Sidebar position (for sidebar/mixed modes) */
  sidebarPosition?: SidebarPosition;
  /** Sidebar width when open (default: 260px) */
  sidebarWidth?: number;
  /** Sidebar collapsed width (default: 64px) */
  sidebarCollapsedWidth?: number;
  /** Header height (default: 60px) */
  headerHeight?: number;
  /** Footer height (default: auto) */
  footerHeight?: string;
  /** Content max width (default: 1200px, 0 = fluid) */
  contentMaxWidth?: number;
  /** Gap between regions (px) */
  gap?: number;
  /** Enable responsive behavior? */
  responsive?: boolean;
  /** Breakpoint for mobile (px, default: 768) */
  mobileBreakpoint?: number;
  /** Show sidebar toggle on mobile? */
  mobileSidebarToggle?: boolean;
  /** Callback on sidebar toggle */
  onSidebarToggle?: (open: boolean) => void;
  /** Custom CSS class for root */
  className?: string;
  /** Dark mode? */
  dark?: boolean;
}

export interface LayoutInstance {
  element: HTMLElement;
  /** Get a region element by ID */
  getRegion: (id: LayoutRegion["id"]) => HTMLElement | null;
  /** Set region content */
  setRegion: (id: LayoutRegion["id"], content: string | HTMLElement) => void;
  /** Toggle sidebar */
  toggleSidebar: () => void;
  /** Check if sidebar is open */
  isSidebarOpen: () => boolean;
  /** Set sidebar open/closed */
  setSidebarOpen: (open: boolean) => void;
  /** Switch layout mode */
  setMode: (mode: LayoutMode) => void;
  /** Destroy cleanup */
  destroy: () => void;
}

// --- Main ---

export function createLayout(options: LayoutOptions): LayoutInstance {
  const opts = {
    mode: options.mode ?? "sidebar",
    sidebarPosition: options.sidebarPosition ?? "left",
    sidebarWidth: options.sidebarWidth ?? 260,
    sidebarCollapsedWidth: options.sidebarCollapsedWidth ?? 64,
    headerHeight: options.headerHeight ?? 60,
    footerHeight: options.footerHeight ?? "auto",
    contentMaxWidth: options.contentMaxWidth ?? 1200,
    gap: options.gap ?? 0,
    responsive: options.responsive ?? true,
    mobileBreakpoint: options.mobileBreakpoint ?? 768,
    mobileSidebarToggle: options.mobileSidebarToggle ?? true,
    dark: options.dark ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Layout: container not found");

  let isSidebarOpen = true;
  let isMobileMenuOpen = false;
  let destroyed = false;

  // Root layout wrapper
  const root = document.createElement("div");
  root.className = `layout-root layout-${opts.mode} ${opts.className}`;
  root.style.cssText = `
    display:flex;flex-direction:column;height:100vh;width:100%;overflow:hidden;
    font-family:-apple-system,sans-serif;
    ${opts.dark ? "color:#e5e7eb;background:#0f172a;" : "color:#111827;background:#fff;"}
  `;

  // Create region elements
  const regions: Record<string, HTMLElement> = {};

  // Header
  const header = document.createElement("header");
  header.id = "layout-header";
  header.className = "layout-region layout-header";
  header.style.cssText = `
    flex-shrink:0;height:${opts.headerHeight}px;display:flex;align-items:center;
    padding:0 20px;border-bottom:1px solid ${opts.dark ? "#1e293b" : "#e5e7eb"};
    background:${opts.dark ? "#1e293b" : "#fff"};z-index:10;position:relative;
  `;
  regions["header"] = header;

  // Body wrapper (sidebar + content)
  const bodyWrapper = document.createElement("div");
  bodyWrapper.className = "layout-body";
  bodyWrapper.style.cssText = `display:flex;flex:1;min-height:0;overflow:hidden;`;

  // Sidebar
  const sidebar = document.createElement("aside");
  sidebar.id = "layout-sidebar";
  sidebar.className = "layout-region layout-sidebar";
  sidebar.style.cssText = `
    flex-shrink:0;width:${opts.sidebarWidth}px;overflow-y:auto;
    border-right:${opts.sidebarPosition === "left" && opts.mode !== "top-nav"
      ? `1px solid ${opts.dark ? "#1e293b" : "#e5e7eb"}`
      : opts.sidebarPosition === "right" ? `none;border-left:1px solid ${opts.dark ? "#1e293b" : "#e5e7eb"}` : "none"};
    background:${opts.dark ? "#0f172a" : "#fff"};
    transition:width 0.25s ease,transform 0.25s ease;
    ${opts.mode === "top-nav" ? "display:none;" : ""}
  `;
  regions["sidebar"] = sidebar;

  // Main content area
  const main = document.createElement("main");
  main.id = "layout-content";
  main.className = "layout-region layout-content";
  main.style.cssText = `
    flex:1;min-width:0;overflow-y:auto;padding:20px;
    ${opts.contentMaxWidth > 0 ? `max-width:${opts.contentMaxWidth}px;margin:0 auto;width:100%;` : ""}
  `;
  regions["content"] = main;

  // Footer
  const footer = document.createElement("footer");
  footer.id = "layout-footer";
  footer.className = "layout-region layout-footer";
  footer.style.cssText = `
    flex-shrink:0;height:${opts.footerHeight};padding:16px 20px;
    border-top:1px solid ${opts.dark ? "#1e293b" : "#e5e7eb"};
    background:${opts.dark ? "#1e293b" : "#f9fafb"};z-index:10;
  `;
  regions["footer"] = footer;

  // Assemble based on mode
  assembleLayout();

  // Mobile overlay for sidebar
  let overlay: HTMLElement | null = null;
  if (opts.responsive) {
    overlay = document.createElement("div");
    overlay.className = "layout-overlay";
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:19;
      display:none;opacity:0;transition:opacity 0.25s ease;
    `;
    overlay.addEventListener("click", () => { isMobileMenuOpen = false; updateMobileState(); });
    root.appendChild(overlay);
  }

  // Mobile hamburger button (in header)
  let hamburgerBtn: HTMLButtonElement | null = null;
  if (opts.mobileSidebarToggle && opts.responsive) {
    hamburgerBtn = document.createElement("button");
    hamburgerBtn.type = "button";
    hamburgerBtn.innerHTML = "&#9776;";
    hamburgerBtn.title = "Toggle menu";
    hamburgerBtn.setAttribute("aria-label", "Toggle navigation menu");
    hamburgerBtn.style.cssText = `
      display:none;background:none;border:none;font-size:20px;cursor:pointer;
      padding:6px;border-radius:4px;color:${opts.dark ? "#e5e7eb" : "#374151"};
      transition:background 0.15s;margin-right:auto;
    `;
    hamburgerBtn.addEventListener("click", () => { isMobileMenuOpen = !isMobileMenuOpen; updateMobileState(); });
    hamburgerBtn.addEventListener("mouseenter", () => { hamburgerBtn!.style.background = `${opts.dark ? "#334155" : "#f3f4f6"}`; });
    hamburgerBtn.addEventListener("mouseleave", () => { hamburgerBtn!.style.background = ""; });
    header.insertBefore(hamburgerBtn, header.firstChild);
  }

  // Responsive handling
  let mediaQuery: MediaQueryList | null = null;
  if (opts.responsive && typeof window !== "undefined") {
    mediaQuery = window.matchMedia(`(max-width: ${opts.mobileBreakpoint}px)`);
    const handleResize = () => {
      if (hamburgerBtn) {
        hamburgerBtn.style.display = mediaQuery!.matches ? "block" : "none";
      }
      if (!mediaQuery!.matches) {
        isMobileMenuOpen = false;
        updateMobileState();
      }
    };
    mediaQuery.addEventListener("change", handleResize);
    handleResize();
  }

  // Assemble DOM
  root.appendChild(header);
  root.appendChild(bodyWrapper);
  root.appendChild(footer);
  container.appendChild(root);

  function assembleLayout(): void {
    bodyWrapper.innerHTML = "";

    switch (opts.mode) {
      case "sidebar":
        if (opts.sidebarPosition === "right") {
          bodyWrapper.appendChild(main);
          bodyWrapper.appendChild(sidebar);
        } else {
          bodyWrapper.appendChild(sidebar);
          bodyWrapper.appendChild(main);
        }
        break;
      case "mixed":
        // Mixed: always show icon bar + collapsible panel
        bodyWrapper.appendChild(sidebar);
        bodyWrapper.appendChild(main);
        break;
      case "top-nav":
        sidebar.style.display = "none";
        bodyWrapper.appendChild(main);
        break;
      case "full-width":
        sidebar.style.display = "none";
        header.style.borderBottom = "none";
        bodyWrapper.appendChild(main);
        break;
    }
  }

  function updateMobileState(): void {
    if (!overlay || !mediaQuery) return;

    if (isMobileMenuOpen) {
      overlay.style.display = "block";
      requestAnimationFrame(() => { overlay!.style.opacity = "1"; });

      sidebar.style.position = "fixed";
      sidebar.style.top = "0";
      sidebar.style.left = "0";
      sidebar.style.height = "100vh";
      sidebar.style.zIndex = "20";
      sidebar.style.transform = "translateX(0)";
    } else {
      overlay.style.opacity = "0";
      setTimeout(() => { if (overlay) overlay.style.display = "none"; }, 250);

      sidebar.style.position = "";
      sidebar.style.top = "";
      sidebar.style.left = "";
      sidebar.style.height = "";
      sidebar.style.zIndex = "";
      sidebar.style.transform = `translateX(${opts.sidebarPosition === "right" ? "" : "-"}100%)`;
    }
  }

  return {
    element: root,

    getRegion(id: LayoutRegion["id"]): HTMLElement | null {
      return regions[id] ?? null;
    },

    setRegion(id: LayoutRegion["id"], content: string | HTMLElement): void {
      const el = regions[id];
      if (!el) return;
      el.innerHTML = "";
      if (typeof content === "string") el.innerHTML = content;
      else el.appendChild(content);
    },

    toggleSidebar() {
      if (mediaQuery?.matches) {
        isMobileMenuOpen = !isMobileMenuOpen;
        updateMobileState();
      } else {
        isSidebarOpen = !isSidebarOpen;
        sidebar.style.width = isSidebarOpen ? `${opts.sidebarWidth}px` : `${opts.sidebarCollapsedWidth}px`;
      }
      opts.onSidebarToggle?.(isSidebarOpen);
    },

    isSidebarOpen() {
      return mediaQuery?.matches ? isMobileMenuOpen : isSidebarOpen;
    },

    setSidebarOpen(open: boolean) {
      if (mediaQuery?.matches) {
        isMobileMenuOpen = open;
        updateMobileState();
      } else {
        isSidebarOpen = open;
        sidebar.style.width = isSidebarOpen ? `${opts.sidebarWidth}px` : `${opts.sidebarCollapsedWidth}px`;
      }
      opts.onSidebarToggle?.(open);
    },

    setMode(mode: LayoutMode) {
      opts.mode = mode;
      assembleLayout();
      render();
    },

    destroy() {
      destroyed = true;
      if (mediaQuery) mediaQuery.removeEventListener("change", () => {});
      root.remove();
    },
  };

  function render(): void {
    // Re-apply styles after mode change
    header.style.borderBottom = opts.mode === "full-width" ? "none" : `1px solid ${opts.dark ? "#1e293b" : "#e5e7eb"}`;
    sidebar.style.display = opts.mode === "top-nav" || opts.mode === "full-width" ? "none" : "";
  }
}
