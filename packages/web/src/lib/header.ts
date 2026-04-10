/**
 * Page Header: Versatile page header with title, subtitle, breadcrumbs,
 * action buttons, tabs, avatar, search, and responsive behavior.
 */

// --- Types ---

export type HeaderSize = "sm" | "md" | "lg";
export type HeaderVariant = "default" | "bordered" | "ghost" | "filled";

export interface HeaderAction {
  /** Button label */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Variant: primary or default */
  variant?: "primary" | "default";
  /** Icon (emoji or SVG) */
  icon?: string;
  /** Disabled? */
  disabled?: boolean;
}

export interface HeaderTab {
  /** Tab key */
  key: string;
  /** Label text */
  label: string;
  /** Active? */
  active?: boolean;
  /** Click handler */
  onClick?: (key: string) => void;
}

export interface HeaderOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Main title */
  title: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Breadcrumb items (label + optional href) */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Action buttons on the right */
  actions?: HeaderAction[];
  /** Tabs below title */
  tabs?: HeaderTab[];
  /** Avatar URL or initials element */
  avatar?: string | HTMLElement;
  /** Search input placeholder */
  searchPlaceholder?: string;
  /** Search callback */
  onSearch?: (query: string) => void;
  /** Size variant */
  size?: HeaderSize;
  /** Visual variant */
  variant?: HeaderVariant;
  /** Background color override */
  background?: string;
  /** Sticky positioning? */
  sticky?: boolean;
  /** Top offset for sticky (px) */
  stickyTop?: number;
  /** Extra content below the main row */
  extra?: string | HTMLElement;
  /** Custom CSS class */
  className?: string;
}

export interface HeaderInstance {
  element: HTMLElement;
  setTitle: (title: string) => void;
  setSubtitle: (subtitle: string) => void;
  setActions: (actions: HeaderAction[]) => void;
  setTabs: (tabs: HeaderTab[]) => void;
  destroy: () => void;
}

// --- Size Config ---

const SIZE_STYLES: Record<HeaderSize, { titleSize: number; subtitleSize: number; padding: string }> = {
  sm: { titleSize: 18, subtitleSize: 12, padding: "12px 16px" },
  md: { titleSize: 22, subtitleSize: 13, padding: "16px 24px" },
  lg: { titleSize: 28, subtitleSize: 14, padding: "24px 32px" },
};

// --- Main ---

export function createHeader(options: HeaderOptions): HeaderInstance {
  const opts = {
    size: options.size ?? "md",
    variant: options.variant ?? "default",
    sticky: options.sticky ?? false,
    stickyTop: options.stickyTop ?? 0,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Header: container not found");

  const sz = SIZE_STYLES[opts.size];
  let destroyed = false;

  function render(): void {
    container.innerHTML = "";
    container.className = `page-header header-${opts.variant} header-${opts.size} ${opts.className}`;

    // Base styles
    let baseStyle = `
      font-family:-apple-system,sans-serif;
      padding:${sz.padding};
      ${opts.sticky ? `position:sticky;top:${opts.stickyTop}px;z-index:100;` : ""}
    `;

    switch (opts.variant) {
      case "bordered":
        baseStyle += `background:#fff;border-bottom:1px solid #e5e7eb;`;
        break;
      case "ghost":
        baseStyle += `background:transparent;`;
        break;
      case "filled":
        baseStyle += `background:${opts.background ?? "#f9fafb"};`;
        break;
      default:
        baseStyle += `background:#fff;`;
    }

    container.style.cssText = baseStyle;

    // Top row: breadcrumb area
    if (opts.breadcrumbs && opts.breadcrumbs.length > 0) {
      const bcRow = document.createElement("div");
      bcRow.className = "header-breadcrumbs";
      bcRow.style.cssText = "display:flex;align-items:center;gap:4px;margin-bottom:6px;font-size:12px;color:#9ca3af;";

      for (let i = 0; i < opts.breadcrumbs.length; i++) {
        const bc = opts.breadcrumbs[i]!;
        if (i > 0) {
          const sep = document.createElement("span");
          sep.textContent = "/";
          sep.style.cssText = "color:#d1d5db;";
          bcRow.appendChild(sep);
        }

        if (bc.href && i < opts.breadcrumbs.length - 1) {
          const a = document.createElement("a");
          a.href = bc.href;
          a.textContent = bc.label;
          a.style.cssText = "color:#6b7280;text-decoration:none;transition:color 0.15s;";
          a.addEventListener("mouseenter", () => { a.style.color = "#4338ca"; });
          a.addEventListener("mouseleave", () => { a.style.color = "#6b7280"; });
          bcRow.appendChild(a);
        } else {
          const span = document.createElement("span");
          span.textContent = bc.label;
          span.style.cssText = "color:#374151;font-weight:500;";
          bcRow.appendChild(span);
        }
      }

      container.appendChild(bcRow);
    }

    // Main row: title + actions
    const mainRow = document.createElement("div");
    mainRow.className = "header-main";
    mainRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;";

    // Left side: avatar + title/subtitle
    const leftSide = document.createElement("div");
    leftSide.style.cssText = "display:flex;align-items:center;gap:12px;min-width:0;flex:1;";

    if (opts.avatar) {
      const avWrap = document.createElement("div");
      avWrap.style.cssText = "flex-shrink:0;";
      if (typeof opts.avatar === "string") {
        if (/^https?:\/|^data:image/.test(opts.avatar)) {
          const img = document.createElement("img");
          img.src = opts.avatar;
          img.alt = "";
          img.style.cssText = "width:40px;height:40px;border-radius:50%;object-fit:cover;";
          avWrap.appendChild(img);
        } else {
          avWrap.innerHTML = `<span style="font-size:28px;">${opts.avatar}</span>`;
        }
      } else {
        avWrap.appendChild(opts.avatar);
      }
      leftSide.appendChild(avWrap);
    }

    const textArea = document.createElement("div");
    textArea.style.cssText = "min-width:0;";

    const titleEl = document.createElement("h1");
    titleEl.className = "header-title";
    titleEl.style.cssText = `margin:0;font-size:${sz.titleSize}px;font-weight:700;color:#111827;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
    titleEl.textContent = opts.title;
    textArea.appendChild(titleEl);

    if (opts.subtitle) {
      const subEl = document.createElement("p");
      subEl.className = "header-subtitle";
      subEl.style.cssText = `margin:2px 0 0;font-size:${sz.subtitleSize}px;color:#6b7280;line-height:1.4;`;
      subEl.textContent = opts.subtitle;
      textArea.appendChild(subEl);
    }

    leftSide.appendChild(textArea);
    mainRow.appendChild(leftSide);

    // Right side: search + actions
    const rightSide = document.createElement("div");
    rightSide.style.cssText = "display:flex;align-items:center;gap:8px;flex-shrink:0;";

    // Search input
    if (opts.searchPlaceholder || opts.onSearch) {
      const searchWrap = document.createElement("div");
      searchWrap.style.cssText = "position:relative;";

      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = opts.searchPlaceholder ?? "Search...";
      searchInput.style.cssText = `
        padding:7px 12px 7px 32px;border:1px solid #d1d5db;border-radius:6px;
        font-size:13px;width:200px;outline:none;background:#f9fafb;
        transition:border-color 0.15s,box-shadow 0.15s;font-family:inherit;
      `;
      searchInput.addEventListener("focus", () => { searchInput.style.borderColor = "#6366f1"; searchInput.style.background = "#fff"; searchInput.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)"; });
      searchInput.addEventListener("blur", () => { searchInput.style.borderColor = "#d1d5db"; searchInput.style.background = "#f9fafb"; searchInput.style.boxShadow = ""; });

      let searchTimer: ReturnType<typeof setTimeout>;
      searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => opts.onSearch?.(searchInput.value), 300);
      });

      // Search icon prefix
      const searchIcon = document.createElement("span");
      searchIcon.innerHTML = "&#128269;";
      searchIcon.style.cssText = "position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;color:#9ca3af;pointer-events:none;";
      searchWrap.appendChild(searchIcon);
      searchWrap.appendChild(searchInput);
      rightSide.appendChild(searchWrap);
    }

    // Action buttons
    if (opts.actions && opts.actions.length > 0) {
      for (const action of opts.actions) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = action.label;
        btn.disabled = action.disabled ?? false;

        const isPrimary = action.variant === "primary";
        btn.style.cssText = isPrimary
          ? `padding:8px 18px;border:none;border-radius:6px;background:#4f46e5;color:#fff;cursor:pointer;font-size:13px;font-weight:500;display:inline-flex;align-items:center;gap:6px;transition:opacity 0.15s;font-family:inherit;`
          : `padding:8px 18px;border:1px solid #d1d5db;border-radius:6px;background:#fff;color:#374151;cursor:pointer;font-size:13px;font-weight:500;display:inline-flex;align-items:center;gap:6px;transition:all 0.15s;font-family:inherit;`;

        if (action.icon) {
          const iconSpan = document.createElement("span");
          iconSpan.textContent = action.icon;
          iconSpan.style.fontSize = "14px";
          btn.insertBefore(iconSpan, btn.firstChild);
        }

        btn.addEventListener("click", () => action.onClick());
        btn.addEventListener("mouseenter", () => { if (!action.disabled) btn.style.opacity = isPrimary ? "0.85" : "1"; btn.style.background = isPrimary ? "" : "#f9fafb"; });
        btn.addEventListener("mouseleave", () => { if (!action.disabled) btn.style.opacity = ""; btn.style.background = isPrimary ? "" : "#fff"; });

        rightSide.appendChild(btn);
      }
    }

    mainRow.appendChild(rightSide);
    container.appendChild(mainRow);

    // Tabs row
    if (opts.tabs && opts.tabs.length > 0) {
      const tabsRow = document.createElement("div");
      tabsRow.className = "header-tabs";
      tabsRow.style.cssText = "display:flex;gap:0;margin-top:16px;border-bottom:1px solid #e5e7eb;";

      for (const tab of opts.tabs) {
        const tabBtn = document.createElement("button");
        tabBtn.type = "button";
        tabBtn.textContent = tab.label;
        tabBtn.style.cssText = `
          padding:10px 16px;border:none;background:none;cursor:pointer;
          font-size:13px;font-weight:${tab.active ? "600" : "400"};
          color:${tab.active ? "#111827" : "#6b7280"};
          border-bottom:2px solid ${tab.active ? "#4f46e5" : "transparent"};
          margin-bottom:-1px;transition:all 0.15s;font-family:inherit;
        `;
        tabBtn.addEventListener("click", () => tab.onClick?.(tab.key));
        tabBtn.addEventListener("mouseenter", () => { if (!tab.active) tabBtn.style.color = "#374151"; });
        tabBtn.addEventListener("mouseleave", () => { if (!tab.active) tabBtn.style.color = "#6b7280"; });
        tabsRow.appendChild(tabBtn);
      }

      container.appendChild(tabsRow);
    }

    // Extra content
    if (opts.extra) {
      const extraEl = document.createElement("div");
      extraEl.className = "header-extra";
      extraEl.style.cssText = "margin-top:16px;";
      if (typeof opts.extra === "string") extraEl.innerHTML = opts.extra;
      else extraEl.appendChild(opts.extra);
      container.appendChild(extraEl);
    }
  }

  // Initial render
  render();

  return {
    element: container,

    setTitle(title: string) {
      opts.title = title;
      render();
    },

    setSubtitle(subtitle: string) {
      opts.subtitle = subtitle;
      render();
    },

    setActions(actions: HeaderAction[]) {
      opts.actions = actions;
      render();
    },

    setTabs(tabs: HeaderTab[]) {
      opts.tabs = tabs;
      render();
    },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };
}
