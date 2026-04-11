/**
 * Lightweight Collapse: Smooth expand/collapse content section with chevron rotation,
 * lazy render-on-expand, size variants (sm/md/lg), 3 variants (default/bordered/ghost),
 * and CollapseGroup for coordinating multiple collapses.
 */

// --- Types ---

export type CollapseVariant = "default" | "bordered" | "ghost";
export type CollapseSize = "sm" | "md" | "lg";

export interface CollapseOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Header title */
  title: string;
  /** Body content (string, HTML, or element) */
  body?: string | HTMLElement;
  /** Visual variant */
  variant?: CollapseVariant;
  /** Size variant */
  size?: CollapseSize;
  /** Initially expanded? */
  defaultExpanded?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Show chevron icon? */
  showChevron?: boolean;
  /** Custom header icon/emoji */
  icon?: string | HTMLElement;
  /** Callback on expand/collapse */
  onToggle?: (expanded: boolean) => void;
  /** Custom CSS class */
  className?: string;
}

export interface CollapseInstance {
  element: HTMLElement;
  isExpanded: () => boolean;
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
  setBody: (content: string | HTMLElement) => void;
  setTitle: (title: string) => void;
  destroy: () => void;
}

export interface CollapseGroupOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Accordion mode (only one open at a time)? */
  accordion?: boolean;
  /** Allow all to be collapsed? */
  allowAllCollapsed?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface CollapseGroupInstance {
  element: HTMLElement;
  getCollapse: (index: number) => CollapseInstance | null;
  expandAll: () => void;
  collapseAll: () => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<CollapseSize, { padding: string; fontSize: number; iconSize: number }> = {
  sm: { padding: "8px 12px", fontSize: 13, iconSize: 14 },
  md: { padding: "10px 16px", fontSize: 14, iconSize: 16 },
  lg: { padding: "12px 20px", fontSize: 15, iconSize: 18 },
};

const VARIANT_BORDER: Record<CollapseVariant, string> = {
  default:  "1px solid #e5e7eb",
  bordered: "1px solid #d1d5db",
  ghost:    "none",
};

const VARIANT_BG: Record<CollapseVariant, string> = {
  default:  "#fff",
  bordered: "#fff",
  ghost:   "transparent",
};

const VARIANT_HEADER_BG: Record<CollapseVariant, string> = {
  default:  "transparent",
  bordered: "#f9fafb",
  ghost:   "transparent",
};

// --- Main Factory ---

export function createCollapse(options: CollapseOptions): CollapseInstance {
  const opts = {
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    defaultExpanded: options.defaultExpanded ?? false,
    disabled: options.disabled ?? false,
    showChevron: options.showChevron ?? true,
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Collapse: container not found");

  const sz = SIZE_STYLES[opts.size];
  let expanded = opts.defaultExpanded;
  let destroyed = false;

  // Root
  const root = document.createElement("div");
  root.className = `collapse collapse-${opts.variant} ${opts.className}`;
  root.style.cssText = `
    border:${VARIANT_BORDER[opts.variant]};border-radius:8px;overflow:hidden;
    background:${VARIANT_BG[opts.variant]};font-family:-apple-system,sans-serif;color:#374151;
    transition:border-color 0.2s;
  `;

  // Header
  const header = document.createElement("button");
  header.type = "button";
  header.className = "collapse-header";
  header.setAttribute("aria-expanded", String(expanded));
  header.style.cssText = `
    display:flex;align-items:center;width:100%;gap:8px;
    background:${VARIANT_HEADER_BG[opts.variant]};border:none;
    padding:${sz.padding};cursor:${opts.disabled ? "not-allowed" : "pointer"};
    font-size:${sz.fontSize}px;font-weight:500;text-align:left;
    color:#111827;transition:background 0.15s;
    font-family:inherit;line-height:1.4;
  `;

  // Icon
  if (options.icon) {
    const iconEl = document.createElement("span");
    iconEl.style.cssText = "display:flex;flex-shrink:0;";
    if (typeof options.icon === "string") {
      iconEl.textContent = options.icon;
      iconEl.style.fontSize = `${sz.iconSize}px`;
    } else {
      iconEl.appendChild(options.icon);
    }
    header.appendChild(iconEl);
  }

  // Title
  const titleEl = document.createElement("span");
  titleEl.className = "collapse-title";
  titleEl.textContent = options.title;
  titleEl.style.cssText = "flex:1;min-width:0;";
  header.appendChild(titleEl);

  // Chevron
  let chevron: HTMLSpanElement | null = null;
  if (opts.showChevron) {
    chevron = document.createElement("span");
    chevron.innerHTML = "&#9660;";
    chevron.style.cssText = `
      flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;
      width:${sz.iconSize + 4}px;height:${sz.iconSize + 4}px;border-radius:4px;
      color:#6b7280;font-size:${sz.iconSize - 2}px;transition:transform 0.25s ease;
      background:#f3f4f6;
    `;
    chevron.style.transform = expanded ? "rotate(180deg)" : "";
    header.appendChild(chevron);
  }

  root.appendChild(header);

  // Body
  let bodyContainer: HTMLDivElement | null = null;

  function ensureBody(): HTMLDivElement {
    if (bodyContainer) return bodyContainer;
    bodyContainer = document.createElement("div");
    bodyContainer.className = "collapse-body";
    bodyContainer.style.cssText = "overflow:hidden;";
    root.appendChild(bodyContainer);

    if (options.body !== undefined) {
      setBodyContent(bodyContainer, options.body);
    }

    return bodyContainer;
  }

  function setBodyContent(el: HTMLElement, content: string | HTMLElement): void {
    el.innerHTML = "";
    if (typeof content === "string") {
      el.innerHTML = content;
    } else {
      el.appendChild(content);
    }
  }

  function updateVisuals(): void {
    if (chevron) chevron.style.transform = expanded ? "rotate(180deg)" : "";
    header.setAttribute("aria-expanded", String(expanded));

    if (bodyContainer) {
      if (expanded) {
        bodyContainer.style.maxHeight = bodyContainer.scrollHeight + "px";
        bodyContainer.style.opacity = "1";
        requestAnimationFrame(() => {
          if (bodyContainer && expanded) {
            bodyContainer.style.maxHeight = "none";
            bodyContainer.style.transition = "max-height 0.3s ease, opacity 0.2s ease";
          }
        });
      } else {
        bodyContainer.style.maxHeight = bodyContainer.scrollHeight + "px";
        bodyContainer.style.overflow = "hidden";
        requestAnimationFrame(() => {
          if (bodyContainer) {
            bodyContainer.style.maxHeight = "0px";
            bodyContainer.style.opacity = "0";
          }
        });
      }
    }
  }

  // Events
  header.addEventListener("click", () => {
    if (opts.disabled || destroyed) return;
    toggle();
  });

  header.addEventListener("keydown", (e: KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !opts.disabled) {
      e.preventDefault();
      toggle();
    }
  });

  // Initial render
  if (options.body !== undefined || options.defaultExpanded) {
    ensureBody();
    updateVisuals();
  }

  // Instance
  const instance: CollapseInstance = {
    element: root,

    isExpanded() { return expanded; },

    expand() {
      if (destroyed || expanded) return;
      ensureBody();
      expanded = true;
      updateVisuals();
      opts.onToggle?.(true);
    },

    collapse() {
      if (destroyed || !expanded) return;
      expanded = false;
      updateVisuals();
      opts.onToggle?.(false);
    },

    toggle() {
      if (destroyed) return;
      expanded = !expanded;
      ensureBody();
      updateVisuals();
      opts.onToggle?.(expanded);
    },

    setBody(content: string | HTMLElement) {
      ensureBody();
      setBodyContent(bodyContainer!, content);
      if (expanded) updateVisuals();
    },

    setTitle(t: string) { titleEl.textContent = t; },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}

// --- Collapse Group ---

export function createCollapseGroup(options: CollapseGroupOptions): CollapseGroupInstance {
  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("CollapseGroup: container not found");

  const collapses: CollapseInstance[] = [];
  let destroyed = false;

  const wrapper = document.createElement("div");
  wrapper.className = `collapse-group ${options.className ?? ""}`;
  wrapper.style.cssText = "display:flex;flex-direction:column;gap:8px;";
  container.appendChild(wrapper);

  const instance: CollapseGroupInstance = {
    element: wrapper,

    getCollapse(index: number): CollapseInstance | null {
      return collapses[index] ?? null;
    },

    expandAll() {
      for (const c of collapses) c.expand();
    },

    collapseAll() {
      for (const c of collapses) c.collapse();
    },

    destroy() {
      destroyed = true;
      for (const c of collapses) c.destroy();
      wrapper.remove();
    },
  };

  // Monkey-patch addCollapse to register with group
  (instance as any).register = (collapse: CollapseInstance) => {
    collapses.push(collapse);
    wrapper.appendChild(collapse.element);

    if (options.accordion) {
      const origToggle = collapse.toggle.bind(collapse);
      collapse.toggle = () => {
        if (c.isExpanded()) {
          c.collapse();
        } else {
          if (!options.allowAllCollapsed) {
            for (const other of collapses) {
              if (other !== c && other.isExpanded()) other.collapse();
            }
          }
          origToggle();
        }
      };
    }
  };

  return instance;
}
