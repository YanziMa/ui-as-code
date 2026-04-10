/**
 * Navbar Component: Top navigation bar with logo, nav links, search input,
 * mobile hamburger menu, user dropdown, theme toggle, and responsive design.
 */

// --- Types ---

export interface NavItem {
  /** Unique ID */
  id: string;
  /** Label */
  label: string;
  /** Link href */
  href?: string;
  /** Icon (emoji or SVG) */
  icon?: string;
  /** Active/highlighted? */
  active?: boolean;
  /** Disabled? */
  disabled?: boolean;
  /** Dropdown sub-items */
  children?: NavItem[];
  /** Badge text */
  badge?: string | number;
  /** External link? (opens in new tab) */
  external?: boolean;
  /** Custom data */
  data?: unknown;
}

export interface UserMenuConfig {
  /** User name */
  name: string;
  /** Email or subtitle */
  email?: string;
  /** Avatar URL or initials fallback */
  avatar?: string;
  /** Menu items */
  items: Array<{
    id: string;
    label: string;
    icon?: string;
    danger?: boolean;
    divider?: boolean;
    onClick?: () => void;
  }>;
}

export interface NavbarOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Logo: text, image URL, or HTMLElement */
  logo?: string | HTMLElement;
  /** Logo click handler */
  onLogoClick?: () => void;
  /** Navigation items */
  items?: NavItem[];
  /** Show search input? */
  showSearch?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Search callback */
  onSearch?: (query: string) => void;
  /** User menu config */
  userMenu?: UserMenuConfig;
  /** Theme toggle? */
  showThemeToggle?: boolean;
  /** Current theme */
  theme?: "light" | "dark";
  /** On theme change */
  onThemeChange?: (theme: "light" | "dark") => void;
  /** Sticky/fixed at top? */
  sticky?: boolean;
  /** Height (px) */
  height?: number;
  /** Border bottom? */
  bordered?: boolean;
  /** Mobile breakpoint (px) */
  mobileBreakpoint?: number;
  /** Custom CSS class */
  className?: string;
  /** Right-side actions (extra elements) */
  actions?: HTMLElement[];
}

export interface NavbarInstance {
  element: HTMLElement;
  setActive: (id: string) => void;
  setSearchQuery: (query: string) => void;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  setUserMenu: (config: UserMenuConfig) => void;
  setItems: (items: NavItem[]) => void;
  destroy: () => void;
}

// --- Main Class ---

export class NavbarManager {
  create(options: NavbarOptions): NavbarInstance {
    const opts = {
      showSearch: options.showSearch ?? false,
      searchPlaceholder: options.searchPlaceholder ?? "Search...",
      showThemeToggle: options.showThemeToggle ?? false,
      theme: options.theme ?? "light",
      sticky: options.sticky ?? true,
      height: options.height ?? 56,
      bordered: options.bordered ?? true,
      mobileBreakpoint: options.mobileBreakpoint ?? 768,
      items: options.items ?? [],
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Navbar: container element not found");

    let isMobileOpen = false;
    let destroyed = false;

    container.className = `navbar ${opts.className ?? ""}`;
    container.style.cssText = `
      position:${opts.sticky ? "sticky" : "relative"};top:0;z-index:1040;
      display:flex;align-items:center;height:${opts.height}px;
      padding:0 16px;background:#fff;
      ${opts.bordered ? "border-bottom:1px solid #e5e7eb;" : ""}
      gap:12px;font-family:-apple-system,sans-serif;
    `;

    // Left section: Logo + Mobile hamburger
    const leftSection = document.createElement("div");
    leftSection.className = "navbar-left";
    leftSection.style.cssText = "display:flex;align-items:center;gap:12px;flex-shrink:0;";
    container.appendChild(leftSection);

    // Mobile hamburger
    const hamburgerBtn = document.createElement("button");
    hamburgerBtn.type = "button";
    hamburgerBtn.className = "navbar-hamburger";
    hamburgerBtn.setAttribute("aria-label", "Toggle menu");
    hamburgerBtn.setAttribute("aria-expanded", "false");
    hamburgerBtn.style.cssText = `
      display:none;width:32px;height:32px;border-radius:6px;
      background:none;border:none;cursor:pointer;flex-direction:column;
      align-items:center;justify-content:center;gap:4px;padding:4px;
    `;
    hamburgerBtn.innerHTML = `
      <span style="display:block;width:18px;height:2px;background:#374151;border-radius:1px;transition:all 0.2s;"></span>
      <span style="display:block;width:18px;height:2px;background:#374151;border-radius:1px;transition:all 0.2s;"></span>
      <span style="display:block;width:18px;height:2px;background:#374151;border-radius:1px;transition:all 0.2s;"></span>
    `;
    hamburgerBtn.addEventListener("click", () => {
      isMobileOpen = !isMobileOpen;
      hamburgerBtn.setAttribute("aria-expanded", String(isMobileOpen));
      updateHamburgerIcon();
      mobileMenu.style.display = isMobileOpen ? "flex" : "none";
    });
    leftSection.appendChild(hamburgerBtn);

    // Logo
    if (options.logo) {
      const logoEl = document.createElement("div");
      logoEl.className = "navbar-logo";
      logoEl.style.cssText = "display:flex;align-items:center;cursor:pointer;font-weight:700;font-size:16px;color:#111827;";

      if (typeof options.logo === "string") {
        if (options.logo.startsWith("<") || options.logo.startsWith("http")) {
          logoEl.innerHTML = options.logo;
        } else {
          logoEl.textContent = options.logo;
        }
      } else {
        logoEl.appendChild(options.logo);
      }

      logoEl.addEventListener("click", () => options.onLogoClick?.());
      leftSection.appendChild(logoEl);
    }

    // Center section: Nav links
    const centerSection = document.createElement("nav");
    centerSection.className = "navbar-nav";
    centerSection.setAttribute("aria-label", "Main navigation");
    centerSection.style.cssText = "display:flex;align-items:center;gap:2px;flex:1;justify-content:center;";
    container.appendChild(centerSection);

    function renderNavItems(): void {
      centerSection.innerHTML = "";
      for (const item of opts.items) {
        if (item.hidden) continue;
        const navLink = createNavLink(item);
        centerSection.appendChild(navLink);
      }
    }

    function createNavLink(item: NavItem): HTMLElement {
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";

      const link = document.createElement("a");
      link.href = item.href ?? "#";
      if (item.external) link.target = "_blank";
      link.className = "navbar-link";
      link.style.cssText = `
        display:flex;align-items:center;gap:5px;padding:6px 12px;
        border-radius:6px;font-size:13px;font-weight:500;color:#374151;
        text-decoration:none;transition:all 0.15s;white-space:nowrap;
        ${item.active ? "background:#eef2ff;color:#4338ca;" : ""}
        ${item.disabled ? "opacity:0.45;pointer-events:none;cursor:not-allowed;" : "cursor:pointer;"}
      `;

      if (opts.showIcons && item.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.style.fontSize = "15px";
        iconSpan.textContent = item.icon;
        link.appendChild(iconSpan);
      }

      const labelSpan = document.createElement("span");
      labelSpan.textContent = item.label;
      link.appendChild(labelSpan);

      if (item.badge !== undefined) {
        const badge = document.createElement("span");
        badge.style.cssText = `
          padding:0 5px;border-radius:10px;font-size:10px;font-weight:600;
          background:#ef4444;color:#fff;margin-left:2px;line-height:1.4;
        `;
        badge.textContent = String(item.badge);
        link.appendChild(badge);
      }

      link.addEventListener("click", (e) => {
        if (item.disabled) { e.preventDefault(); return; }
        if (item.children?.length) {
          e.preventDefault();
          // Toggle submenu visibility
          const existingSub = wrapper.querySelector(".navbar-submenu");
          if (existingSub) {
            existingSub.remove();
          } else {
            // Close other submenus first
            centerSection.querySelectorAll(".navbar-submenu").forEach((s) => s.remove());
            const subMenu = createSubMenu(item.children!);
            subMenu.style.cssText += `left:0;top:calc(100% + 4px);`;
            wrapper.appendChild(subMenu);
          }
          return;
        }
        // Set active
        for (const opt of opts.items) opt.active = false;
        item.active = true;
        renderNavItems();
      });

      link.addEventListener("mouseenter", () => {
        if (!item.disabled && !item.active) {
          link.style.background = "#f5f3ff";
          link.style.color = "#4338ca";
        }
      });
      link.addEventListener("mouseleave", () => {
        if (!item.disabled && !item.active) {
          link.style.background = "";
          link.style.color = "";
        }
      });

      wrapper.appendChild(link);
      return wrapper;
    }

    function createSubMenu(children: NavItem[]): HTMLElement {
      const menu = document.createElement("div");
      menu.className = "navbar-submenu";
      menu.style.cssText = `
        position:absolute;display:flex;flex-direction:column;min-width:180px;
        background:#fff;border:1px solid #e5e7eb;border-radius:8px;
        box-shadow:0 10px 30px rgba(0,0,0,0.1);padding:4px 0;z-index:1050;
      `;

      for (const child of children) {
        const childLink = document.createElement("a");
        childLink.href = child.href ?? "#";
        childLink.style.cssText = `
          display:flex;align-items:center;gap:8px;padding:8px 14px;
          font-size:13px;color:#374151;text-decoration:none;cursor:pointer;
          transition:background 0.1s;
        `;
        if (child.icon) {
          const ic = document.createElement("span");
          ic.textContent = child.icon;
          ic.style.fontSize = "14px";
          childLink.appendChild(ic);
        }
        childLink.textContent += child.label;
        childLink.addEventListener("mouseenter", () => { childLink.style.background = "#f5f3ff"; });
        childLink.addEventListener("mouseleave", () => { childLink.style.background = ""; });
        menu.appendChild(childLink);
      }

      return menu;
    }

    // Right section: Search, actions, user menu
    const rightSection = document.createElement("div");
    rightSection.className = "navbar-right";
    rightSection.style.cssText = "display:flex;align-items:center;gap:8px;flex-shrink:0;";
    container.appendChild(rightSection);

    // Search input
    let searchInput: HTMLInputElement | null = null;
    if (opts.showSearch) {
      const searchWrapper = document.createElement("div");
      searchWrapper.style.cssText = "position:relative;";

      searchInput = document.createElement("input");
      searchInput.type = "search";
      searchInput.placeholder = opts.searchPlaceholder;
      searchInput.style.cssText = `
        width:200px;height:34px;padding:0 12px 0 32px;border:1px solid #d1d5db;
        border-radius:8px;font-size:13px;outline:none;transition:border-color 0.15s;
        background:#f9fafb;
      `;

      const searchIcon = document.createElement("span");
      searchIcon.innerHTML = `\uD83D\uDD0D`; // magnifying glass emoji
      searchIcon.style.cssText = "position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;pointer-events:none;opacity:0.5;";
      searchWrapper.appendChild(searchIcon);
      searchWrapper.appendChild(searchInput);
      rightSection.appendChild(searchWrapper);

      searchInput.addEventListener("focus", () => { searchInput!.style.borderColor = "#6366f1"; searchInput!.style.background = "#fff"; });
      searchInput.addEventListener("blur", () => { searchInput!.style.borderColor = "#d1d5db"; searchInput!.style.background = "#f9fafb"; });
      searchInput.addEventListener("input", () => { opts.onSearch?.(searchInput!.value); });
    }

    // Extra action buttons
    if (options.actions) {
      for (const action of options.actions) {
        rightSection.appendChild(action);
      }
    }

    // Theme toggle
    if (opts.showThemeToggle) {
      const themeBtn = document.createElement("button");
      themeBtn.type = "button";
      themeBtn.title = `Switch to ${opts.theme === "light" ? "dark" : "light"} mode`;
      themeBtn.style.cssText = `
        width:34px;height:34px;border-radius:8px;border:1px solid #d1d5db;
        background:#fff;cursor:pointer;display:flex;align-items:center;
        justify-content:center;font-size:16px;transition:all 0.15s;
      `;
      themeBtn.textContent = opts.theme === "light" ? "\u1F319" : "\u2600\uFE0F";
      themeBtn.addEventListener("click", () => {
        const newTheme = opts.theme === "light" ? "dark" : "light";
        opts.theme = newTheme;
        themeBtn.textContent = newTheme === "light" ? "\u1F319" : "\u2600\uFE0F";
        themeBtn.title = `Switch to ${newTheme === "light" ? "dark" : "light"} mode`;
        opts.onThemeChange?.(newTheme);
      });
      rightSection.appendChild(themeBtn);
    }

    // User menu
    let userDropdown: HTMLDivElement | null = null;
    if (options.userMenu) {
      userDropdown = createUserDropdown(options.userMenu);
      rightSection.appendChild(userDropdown);
    }

    function createUserDropdown(config: UserMenuConfig): HTMLDivElement {
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "navbar-user-trigger";
      trigger.style.cssText = `
        display:flex;align-items:center;gap:8px;padding:4px 8px;
        border-radius:20px;border:1px solid transparent;cursor:pointer;
        transition:background 0.15s;
      `;

      // Avatar
      if (config.avatar) {
        const avatar = document.createElement("img");
        avatar.src = config.avatar;
        avatar.alt = config.name;
        avatar.style.cssText = "width:30px;height:30px;border-radius:50%;object-fit:cover;";
        trigger.appendChild(avatar);
      } else {
        const initials = document.createElement("span");
        initials.style.cssText = `
          width:30px;height:30px;border-radius:50%;background:#eef2ff;color:#4338ca;
          display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;
        `;
        initials.textContent = config.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
        trigger.appendChild(initials);
      }

      // Name (hidden on small screens)
      const nameSpan = document.createElement("span");
      nameSpan.style.cssText = "font-size:13px;font-weight:500;color:#374151;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      nameSpan.textContent = config.name;
      trigger.appendChild(nameSpan);

      // Chevron
      const chevron = document.createElement("span");
      chevron.textContent = "\u25BE";
      chevron.style.cssText = "font-size:10px;color:#9ca3af;";
      trigger.appendChild(chevron);

      // Dropdown panel
      const panel = document.createElement("div");
      panel.className = "navbar-user-panel";
      panel.style.cssText = `
        position:absolute;top:calc(100% + 4px);right:0;min-width:200px;
        background:#fff;border:1px solid #e5e7eb;border-radius:10px;
        box-shadow:0 10px 30px rgba(0,0,0,0.12);padding:8px 0;
        display:none;z-index:1060;
      `;

      // User info header
      const userInfo = document.createElement("div");
      userInfo.style.cssText = "padding:12px 16px;border-bottom:1px solid #f3f4f6;";
      userInfo.innerHTML = `<div style="font-weight:600;font-size:13px;">${config.name}</div>
        ${config.email ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px;">${config.email}</div>` : ""}`;
      panel.appendChild(userInfo);

      // Menu items
      for (const mi of config.items) {
        if (mi.divider) {
          const div = document.createElement("div");
          div.style.cssText = "height:1px;background:#f3f4f6;margin:4px 12px;";
          panel.appendChild(div);
          continue;
        }

        const menuItem = document.createElement("button");
        menuItem.type = "button";
        menuItem.style.cssText = `
          display:flex;align-items:center;gap:8px;width:100%;
          padding:8px 16px;border:none;background:none;cursor:pointer;
          font-size:13px;text-align:left;color:${mi.danger ? "#dc2626" : "#374151"};
          transition:background 0.1s;
        `;
        if (mi.icon) {
          const ic = document.createElement("span");
          ic.textContent = mi.icon;
          ic.style.fontSize = "14px";
          menuItem.appendChild(ic);
        }
        menuItem.textContent += mi.label;
        menuItem.addEventListener("click", () => {
          mi.onClick?.();
          panel.style.display = "none";
        });
        menuItem.addEventListener("mouseenter", () => { menuItem.style.background = "#f5f3ff"; });
        menuItem.addEventListener("mouseleave", () => { menuItem.style.background = ""; });
        panel.appendChild(menuItem);
      }

      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.appendChild(trigger);
      wrapper.appendChild(panel);

      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        panel.style.display = panel.style.display === "none" ? "block" : "none";
      });

      document.addEventListener("mousedown", () => { panel.style.display = "none"; }, { once: true });

      return wrapper;
    }

    // Mobile menu (below navbar)
    const mobileMenu = document.createElement("div");
    mobileMenu.className = "navbar-mobile-menu";
    mobileMenu.style.cssText = `
      display:none;flex-direction:column;padding:12px 16px;
      background:#fff;border-bottom:1px solid #e5e7eb;gap:4px;
    `;

    // Populate mobile menu with nav items
    function renderMobileMenu(): void {
      mobileMenu.innerHTML = "";
      for (const item of opts.items) {
        if (item.hidden) continue;
        const mLink = document.createElement("a");
        mLink.href = item.href ?? "#";
        mLink.style.cssText = `
          display:flex;align-items:center;gap:8px;padding:10px 12px;
          border-radius:6px;font-size:14px;font-weight:500;color:#374151;
          text-decoration:none;${item.active ? "background:#eef2ff;color:#4338ca;" : ""}
          transition:background 0.1s;
        `;
        if (item.icon) {
          const ic = document.createElement("span");
          ic.textContent = item.icon;
          ic.style.fontSize = "16px";
          mLink.appendChild(ic);
        }
        mLink.textContent += item.label;
        mLink.addEventListener("click", () => {
          for (const opt of opts.items) opt.active = false;
          item.active = true;
          renderNavItems();
          renderMobileMenu();
          instance.closeMobileMenu();
        });
        mobileMenu.appendChild(mLink);
      }
    }

    // Insert mobile menu after the navbar
    container.parentNode?.insertBefore(mobileMenu, container.nextSibling);

    // Responsive handling
    const mediaQuery = window.matchMedia(`(max-width: ${opts.mobileBreakpoint}px)`);
    function handleResize(e: MediaQueryListEvent | MediaQueryList): void {
      const isMobile = e.matches;
      hamburgerBtn.style.display = isMobile ? "flex" : "none";
      centerSection.style.display = isMobile ? "none" : "flex";
      if (!isMobile) {
        mobileMenu.style.display = "none";
        isMobileOpen = false;
        hamburgerBtn.setAttribute("aria-expanded", "false");
        updateHamburgerIcon();
      }
    }
    mediaQuery.addEventListener("change", handleResize as EventListener);
    handleResize(mediaQuery);

    function updateHamburgerIcon(): void {
      const spans = hamburgerBtn.querySelectorAll("span");
      if (isMobileOpen) {
        spans[0]!.style.transform = "rotate(45deg) translate(4px, 4px)";
        spans[1]!.style.opacity = "0";
        spans[2]!.style.transform = "rotate(-45deg) translate(4px, -4px)";
      } else {
        spans[0]!.style.transform = "";
        spans[1]!.style.opacity = "";
        spans[2]!.style.transform = "";
      }
    }

    // Initial renders
    renderNavItems();
    renderMobileMenu();

    const instance: NavbarInstance = {
      element: container,

      setActive(id: string) {
        for (const item of opts.items) item.active = item.id === id;
        renderNavItems();
        renderMobileMenu();
      },

      setSearchQuery(query: string) {
        if (searchInput) {
          searchInput.value = query;
          opts.onSearch?.(query);
        }
      },

      openMobileMenu() {
        isMobileOpen = true;
        hamburgerBtn.setAttribute("aria-expanded", "true");
        updateHamburgerIcon();
        mobileMenu.style.display = "flex";
      },

      closeMobileMenu() {
        isMobileOpen = false;
        hamburgerBtn.setAttribute("aria-expanded", "false");
        updateHamburgerIcon();
        mobileMenu.style.display = "none";
      },

      setUserMenu(config: UserMenuConfig) {
        if (userDropdown) userDropdown.remove();
        userDropdown = createUserDropdown(config);
        rightSection.appendChild(userDropdown);
      },

      setItems(items: NavItem[]) {
        opts.items = items;
        renderNavItems();
        renderMobileMenu();
      },

      destroy() {
        destroyed = true;
        mediaQuery.removeEventListener("change", handleResize as EventListener);
        mobileMenu.remove();
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a navbar */
export function createNavbar(options: NavbarOptions): NavbarInstance {
  return new NavbarManager().create(options);
}
