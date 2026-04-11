/**
 * Navbar Utilities: Navigation bar with logo, links, search, user menu,
 * mobile hamburger, sticky behavior, scroll-aware styling, and responsive
 * collapse.
 */

// --- Types ---

export type NavbarStyle = "default" | "floating" | "transparent" | "bordered";
export type NavbarSize = "sm" | "md" | "lg";

export interface NavItem {
  /** Display label */
  label: string;
  /** URL or path */
  href?: string;
  /** Icon HTML */
  icon?: string;
  /** Active state */
  active?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Dropdown sub-items */
  children?: NavItem[];
  /** Click handler */
  onClick?: () => void;
}

export interface UserMenuConfig {
  /** Avatar image or initials element */
  avatar?: HTMLElement | string;
  /** User display name */
  name?: string;
  /** Email/subtitle */
  email?: string;
  /** Menu items */
  items: Array<{
    label: string;
    icon?: string;
    onClick: () => void;
    danger?: boolean;
    divider?: boolean;
  }>;
}

export interface SearchConfig {
  /** Placeholder text */
  placeholder?: string;
  /** Called on submit */
  onSearch?: (query: string) => void;
  /** Show clear button */
  showClear?: boolean;
  /** Keyboard shortcut hint */
  shortcut?: string;
}

export interface NavbarOptions {
  /** Brand/logo content (HTML string or element) */
  brand?: HTMLElement | string;
  /** Navigation links */
  items?: NavItem[];
  /** Position brand left or center? */
  brandPosition?: "left" | "center";
  /** Style variant */
  style?: NavbarStyle;
  /** Size variant */
  size?: NavbarSize;
  /** Sticky at top when scrolling? */
  sticky?: boolean;
  /** Hide on scroll down, show on scroll up? */
  hideOnScroll?: boolean;
  /** Background color override */
  backgroundColor?: string;
  /** Text color override */
  textColor?: string;
  /** Height in px (auto by size) */
  height?: number;
  /** Right-side elements */
  userMenu?: UserMenuConfig;
  search?: SearchConfig;
  /** Custom right-side actions (HTMLElement array) */
  actions?: HTMLElement[];
  /** Mobile breakpoint (px) */
  mobileBreakpoint?: number;
  /** Container max width */
  maxWidth?: number;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
  /** Called when nav item is clicked */
  onItemClick?: (item: NavItem) => void;
}

export interface NavbarInstance {
  /** Root navbar element */
  el: HTMLElement;
  /** Set items dynamically */
  setItems: (items: NavItem[]) => void;
  /** Set active item */
  setActive: (label: string) => void;
  /** Open/close mobile menu */
  toggleMobile: () => void;
  /** Update background color (e.g., on scroll) */
  setBackgroundColor: (color: string) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Size Config ---

const NAV_SIZES: Record<NavbarSize, { height: string; fontSize: string; padding: string }> = {
  sm: { height: "48px", fontSize: "13px", padding: "0 16px" },
  md: { height: "60px", fontSize: "14px", padding: "0 24px" },
  lg: { height: "72px", fontSize: "15px", padding: "0 32px" },
};

// --- Core Factory ---

/**
 * Create a navigation bar component.
 *
 * @example
 * ```ts
 * const navbar = createNavbar({
 *   brand: "<strong>MyApp</strong>",
 *   items: [
 *     { label: "Home", href: "/", active: true },
 *     { label: "Docs", href: "/docs" },
 *     { label: "Pricing", href: "/pricing" },
 *   ],
 *   sticky: true,
 * });
 * ```
 */
export function createNavbar(options: NavbarOptions = {}): NavbarInstance {
  const {
    brand,
    items = [],
    brandPosition = "left",
    style = "default",
    size = "md",
    sticky = false,
    hideOnScroll = false,
    backgroundColor,
    textColor,
    height,
    userMenu,
    search,
    actions = [],
    container,
    className,
    onItemClick,
  } = options;

  let _items = [...items];
  let _mobileOpen = false;
  let _lastScrollY = 0;
  let _hidden = false;

  const ns = NAV_SIZES[size];

  // Root
  const root = document.createElement("header");
  root.className = `navbar ${style} ${size} ${className ?? ""}`.trim();
  root.setAttribute("role", "banner");

  let baseStyles =
    `display:flex;align-items:center;justify-content:space-between;` +
    `height:${height ? `${height}px` : ns.height};padding:${ns.padding};` +
    `font-size:${ns.fontSize};position:${sticky ? "sticky" : "relative"};top:0;z-index:1000;` +
    "transition:transform 0.3s ease,background-color 0.2s ease;";

  // Style-specific backgrounds
  switch (style) {
    case "floating":
      baseStyles += "background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.08);margin:12px;border-radius:10px;";
      break;
    case "transparent":
      baseStyles += "background:transparent;color:#fff;";
      break;
    case "bordered":
      baseStyles += "background:#fff;border-bottom:1px solid #e5e7eb;";
      break;
    default:
      baseStyles += "background:#fff;";
      break;
  }

  if (backgroundColor) baseStyles += `background:${backgroundColor};`;
  if (textColor) baseStyles += `color:${textColor};`;

  root.style.cssText = baseStyles;

  // Inner container with max-width
  const inner = document.createElement("div");
  inner.className = "navbar-inner";
  inner.style.cssText =
    "display:flex;align-items:center;width:100%;gap:8px;" +
    (options.maxWidth ? `max-width:${options.maxWidth}px;margin:0 auto;` : "");
  root.appendChild(inner);

  // --- Left section (brand + nav links) ---
  const leftSection = document.createElement("div");
  leftSection.className = "navbar-left";
  leftSection.style.cssText =
    "display:flex;align-items:center;gap:24px;flex:1;" +
    (brandPosition === "center" ? "flex:1;" : "");
  inner.appendChild(leftSection);

  // Brand
  if (brand) {
    const brandEl = document.createElement("a");
    brandEl.className = "navbar-brand";
    brandEl.href = "#";
    brandEl.style.cssText =
      "display:flex;align-items:center;font-size:17px;font-weight:700;" +
      "color:inherit;text-decoration:none;line-height:1;";
    if (typeof brand === "string") brandEl.innerHTML = brand;
    else brandEl.appendChild(brand.cloneNode(true));
    leftSection.appendChild(brandEl);
  }

  // Nav links (desktop)
  const navLinks = document.createElement("nav");
  navLinks.className = "navbar-links";
  navLinks.setAttribute("role", "navigation");
  navLinks.style.cssText =
    "display:flex;align-items:center;gap:4px;";
  leftSection.appendChild(navLinks);

  function renderLinks(): void {
    navLinks.innerHTML = "";
    _items.forEach((item) => {
      const link = document.createElement(item.href ? "a" : "button");
      link.className = `nav-link${item.active ? " active" : ""}`;
      if (item.href) (link as HTMLAnchorElement).href = item.href;
      else (link as HTMLButtonElement).type = "button";
      link.style.cssText =
        "display:inline-flex;align-items:center;gap:4px;padding:6px 12px;" +
        "border-radius:6px;font-size:inherit;font-weight:500;text-decoration:none;" +
        "color:inherit;border:none;background:none;cursor:pointer;transition:all 0.15s;" +
        (item.active ? "background:#f3f4f6;color:#111827;" : "") +
        (item.disabled ? "opacity:0.45;pointer-events:none;cursor:not-allowed;" : "");

      if (item.icon) {
        const ic = document.createElement("span");
        ic.innerHTML = item.icon;
        ic.style.cssText = "display:inline-flex;line-height:1;";
        link.appendChild(ic);
      }

      const lbl = document.createElement("span");
      lbl.textContent = item.label;
      link.appendChild(lbl);

      if (!item.disabled) {
        link.addEventListener("mouseenter", () => {
          if (!item.active) { link.style.background = "#f9fafb"; }
        });
        link.addEventListener("mouseleave", () => {
          if (!item.active) { link.style.background = ""; }
        });

        link.addEventListener("click", (e) => {
          e.preventDefault();
          onItemClick?.(item);
          item.onClick?.();
          if (item.href && !item.children) window.location.href = item.href;
        });
      }

      navLinks.appendChild(link);
    });
  }

  renderLinks();

  // --- Right section ---
  const rightSection = document.createElement("div");
  rightSection.className = "navbar-right";
  rightSection.style.cssText = "display:flex;align-items:center;gap:8px;";
  inner.appendChild(rightSection);

  // Search bar
  if (search) {
    const searchWrap = document.createElement("div");
    searchWrap.className = "navbar-search";
    searchWrap.style.cssText =
      "display:flex;align-items:center;gap:4px;padding:5px 10px;" +
      "border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;" +
      "max-width:240px;";

    const searchIcon = document.createElement("span");
    searchIcon.innerHTML = "&#128269;";
    searchIcon.style.cssText = "font-size:14px;color:#9ca3af;flex-shrink:0;";
    searchWrap.appendChild(searchIcon);

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = search.placeholder ?? "Search...";
    input.style.cssText =
      "border:none;background:none;outline:none;font-size:13px;color:#374151;" +
      "width:100%;min-width:80px;";
    searchWrap.appendChild(input);

    if (search.showClear) {
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.innerHTML = "&times;";
      clearBtn.style.cssText =
        "display:none;background:none;border:none;cursor:pointer;color:#9ca3af;padding:0 2px;";
      clearBtn.addEventListener("click", () => { input.value = ""; clearBtn.style.display = "none"; });
      input.addEventListener("input", () => { clearBtn.style.display = input.value ? "block" : "none"; });
      searchWrap.appendChild(clearBtn);
    }

    if (search.shortcut) {
      const kbd = document.createElement("kbd");
      kbd.textContent = search.shortcut;
      kbd.style.cssText =
        "font-size:10px;padding:1px 5px;border:1px solid #d1d5db;border-radius:4px;" +
        "background:#fff;color:#9ca3af;margin-left:auto;white-space:nowrap;";
      searchWrap.appendChild(kbd);
    }

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") search.onSearch?.(input.value);
    });

    rightSection.appendChild(searchWrap);
  }

  // Actions
  for (const action of actions) {
    rightSection.appendChild(action.cloneNode(true) as HTMLElement);
  }

  // User menu
  if (userMenu) {
    const userBtn = document.createElement("button");
    userBtn.type = "button";
    userBtn.className = "navbar-user-btn";
    userBtn.style.cssText =
      "display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:20px;" +
      "border:1px solid #e5e7eb;background:#fff;cursor:pointer;transition:all 0.15s;";

    if (userMenu.avatar) {
      const av = document.createElement("span");
      av.style.cssText =
        "width:28px;height:28px;border-radius:50%;background:#e5e7eb;display:flex;" +
        "align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#6b7280;overflow:hidden;";
      if (typeof userMenu.avatar === "string") av.textContent = userMenu.avatar.slice(0, 2).toUpperCase();
      else av.appendChild(userMenu.avatar.cloneNode(true));
      userBtn.appendChild(av);
    } else {
      const defaultAvatar = document.createElement("span");
      defaultAvatar.textContent = (userMenu.name ?? "U")[0]!.toUpperCase();
      defaultAvatar.style.cssText =
        "width:28px;height:28px;border-radius:50%;background:#3b82f6;color:#fff;" +
        "display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;";
      userBtn.appendChild(defaultAvatar);
    }

    if (userMenu.name) {
      const nameSpan = document.createElement("span");
      nameSpan.textContent = userMenu.name;
      nameSpan.style.cssText = "font-size:13px;font-weight:500;color:#374151;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      userBtn.appendChild(nameSpan);
    }

    // Dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "navbar-user-dropdown";
    dropdown.style.cssText =
      "position:absolute;top:100%;right:0;margin-top:4px;min-width:200px;" +
      "background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);" +
      "padding:6px 0;display:none;z-index:1001;";

    for (const mi of userMenu.items) {
      if (mi.divider) {
        const div = document.createElement("div");
        div.style.cssText = "height:1px;background:#f3f4f6;margin:4px 12px;";
        dropdown.appendChild(div);
        continue;
      }
      const menuItem = document.createElement("button");
      menuItem.type = "button";
      menuItem.innerHTML = mi.icon ? `${mi.icon} ${mi.label}` : mi.label;
      menuItem.style.cssText =
        "display:flex;align-items:center;gap:8px;width:100%;padding:8px 16px;" +
        "border:none;background:none;cursor:pointer;font-size:13px;color:#374151;" +
        "text-align:left;border-radius:6px;transition:background 0.12s;" +
        (mi.danger ? "color:#dc2626;" : "");
      menuItem.addEventListener("mouseenter", () => { menuItem.style.background = "#f9fafb"; });
      menuItem.addEventListener("mouseleave", () => { menuItem.style.background = ""; });
      menuItem.addEventListener("click", (e) => {
        e.stopPropagation();
        mi.onClick();
        dropdown.style.display = "none";
      });
      dropdown.appendChild(menuItem);
    }

    // Wrap user button in relative container
    const userWrap = document.createElement("div");
    userWrap.style.position = "relative";
    userWrap.appendChild(userBtn);
    userWrap.appendChild(dropdown);
    rightSection.appendChild(userWrap);

    userBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display !== "none";
      dropdown.style.display = isOpen ? "none" : "block";
    });

    document.addEventListener("click", () => { dropdown.style.display = "none"; });
  }

  // Mobile toggle
  const mobileToggle = document.createElement("button");
  mobileToggle.type = "button";
  mobileToggle.className = "navbar-mobile-toggle";
  mobileToggle.setAttribute("aria-label", "Open menu");
  mobileToggle.innerHTML = `<span style="display:block;width:20px;height:2px;background:currentColor;margin:4px 0;border-radius:1px;"></span><span style="display:block;width:20px;height:2px;background:currentColor;margin:4px 0;border-radius:1px;"></span><span style="display:block;width:20px;height:2px;background:currentColor;margin:4px 0;border-radius:1px;"></span>`;
  mobileToggle.style.cssText =
    "display:none;flex-direction:column;justify-content:center;gap:3px;" +
    "padding:6px;border:none;background:none;cursor:pointer;row-gap:4px;";
  rightSection.appendChild(mobileToggle);

  // Mobile menu panel
  const mobilePanel = document.createElement("div");
  mobilePanel.className = "navbar-mobile-panel";
  mobilePanel.style.cssText =
    "display:none;position:fixed;top:0;left:0;right:0;bottom:0;" +
    `background:#fff;z-index:999;padding-top:${height ? `${height}px` : ns.height};`;

  const mobileClose = document.createElement("button");
  mobileClose.type = "button";
  mobileClose.innerHTML = "&times;";
  mobileClose.style.cssText =
    "position:absolute;top:12px;right:16px;font-size:24px;border:none;background:none;cursor:pointer;color:#374151;";
  mobileClose.addEventListener("click", toggleMobile);
  mobilePanel.appendChild(mobileClose);

  const mobileNavContent = document.createElement("div");
  mobileNavContent.style.padding = "16px";
  _items.forEach((item) => {
    const link = document.createElement("a");
    link.href = item.href ?? "#";
    link.textContent = item.label;
    link.style.cssText =
      "display:block;padding:12px 16px;font-size:16px;color:#374151;text-decoration:none;" +
      "border-radius:8px;transition:background 0.12s;" +
      (item.active ? "background:#eff6ff;color:#2563eb;font-weight:600;" : "");
    link.addEventListener("click", () => { toggleMobile(); onItemClick?.(item); });
    mobileNavContent.appendChild(link);
  });
  mobilePanel.appendChild(mobilePanel);

  mobileToggle.addEventListener("click", toggleMobile);

  // Scroll handling
  if (hideOnScroll || style === "transparent") {
    let scrollHandler: (() => void) | null = null;

    scrollHandler = () => {
      const currentY = window.scrollY;

      if (hideOnScroll) {
        if (currentY > _lastScrollY && currentY > 100 && !_hidden) {
          _hidden = true;
          root.style.transform = "translateY(-100%)";
        } else if (currentY < _lastScrollY - 5 && _hidden) {
          _hidden = false;
          root.style.transform = "";
        }
      }

      if (style === "transparent" && currentY > 20) {
        root.style.backgroundColor = backgroundColor ?? "#fff";
        root.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
      } else if (style === "transparent" && currentY <= 20) {
        root.style.backgroundColor = "transparent";
        root.style.boxShadow = "";
      }

      _lastScrollY = currentY;
    };

    window.addEventListener("scroll", scrollHandler, { passive: true });
  }

  // --- Methods ---

  function setItems(newItems: NavItem[]): void {
    _items = newItems;
    renderLinks();
  }

  function setActive(label: string): void {
    _items = _items.map((i) => ({ ...i, active: i.label === label }));
    renderLinks();
  }

  function toggleMobile(): void {
    _mobileOpen = !_mobileOpen;
    mobilePanel.style.display = _mobileOpen ? "block" : "none";
    document.body.style.overflow = _mobileOpen ? "hidden" : "";
  }

  function setBackgroundColor(color: string): void {
    root.style.backgroundColor = color;
  }

  function destroy(): void {
    root.remove();
    mobilePanel.remove();
  }

  (container ?? document.body).appendChild(root);
  (container ?? document.body).appendChild(mobilePanel);

  return { el: root, setItems, setActive, toggleMobile, setBackgroundColor, destroy };
}
