/**
 * Lightweight Accordion: Collapsible sections with single/multiple mode,
 * smooth height animation, size variants, icons, and keyboard navigation.
 */

// --- Types ---

export type AccordionVariant = "default" | "bordered" | "separated" | "filled";
export type AccordionSize = "sm" | "md" | "lg";

export interface AccordionItem {
  /** Unique key */
  key: string;
  /** Header title */
  title: string;
  /** Content (string or element) */
  content?: string | HTMLElement;
  /** Disabled? */
  disabled?: boolean;
  /** Icon (emoji or HTML) */
  icon?: string | HTMLElement;
  /** Extra content in header (e.g., badge) */
  extra?: string | HTMLElement;
}

export interface AccordionOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Accordion items */
  items: AccordionItem[];
  /** Active keys (open panels) */
  activeKeys?: string[];
  /** Allow multiple open? */
  multiple?: boolean;
  /** Visual variant */
  variant?: AccordionVariant;
  /** Size variant */
  size?: AccordionSize;
  /** Show expand/collapse icons? */
  showIcon?: boolean;
  /** Border radius (px) */
  borderRadius?: number;
  /** Callback on panel change */
  onChange?: (keys: string[]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface AccordionInstance {
  element: HTMLElement;
  getActiveKeys: () => string[];
  setActiveKeys: (keys: string[]) => void;
  toggleKey: (key: string) => void;
  getItems: () => AccordionItem[];
  setItems: (items: AccordionItem[]) => void;
  addItem: (item: AccordionItem) => void;
  removeItem: (key: string) => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<AccordionSize, { padding: string; fontSize: string; iconSize: string; gap: string }> = {
  sm: { padding: "8px 12px", fontSize: "12px", iconSize: "12px", gap: "4px" },
  md: { padding: "10px 16px", fontSize: "13px", iconSize: "14px", gap: "6px" },
  lg: { padding: "14px 20px", fontSize: "14px", iconSize: "16px", gap: "8px" },
};

const VARIANT_STYLES: Record<AccordionVariant, {
  bg: string; headerBg: string; headerHoverBg: string;
  border: string; itemBorder: string; borderRadius: number;
}> = {
  default:   { bg: "#fff", headerBg: "transparent", headerHoverBg: "#f9fafb", border: "transparent", itemBorder: "#e5e7eb", borderRadius: 6 },
  bordered:  { bg: "#fff", headerBg: "#f9fafb", headerHoverBg: "#f3f4f6", border: "#e5e7eb", itemBorder: "#e5e7eb", borderRadius: 6 },
  separated: { bg: "#fff", headerBg: "transparent", headerHoverBg: "#f9fafb", border: "transparent", itemBorder: "#e5e7eb", borderRadius: 6 },
  filled:    { bg: "#f3f4f6", headerBg: "#fff", headerHoverBg: "#fafafa", border: "transparent", itemBorder: "transparent", borderRadius: 8 },
};

// --- Main Factory ---

export function createAccordion(options: AccordionOptions): AccordionInstance {
  const opts = {
    activeKeys: options.activeKeys ?? (options.items.length > 0 ? [options.items[0]!.key] : []),
    multiple: options.multiple ?? false,
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    showIcon: options.showIcon ?? true,
    borderRadius: options.borderRadius ?? 0,
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Accordion: container not found");

  let items = [...options.items];
  let destroyed = false;

  // Track open/close state per panel
  const openState: Map<string, boolean> = new Map();
  for (const k of opts.activeKeys) openState.set(k, true);

  const sz = SIZE_STYLES[opts.size];
  const vs = VARIANT_STYLES[opts.variant];
  const br = opts.borderRadius || vs.borderRadius;

  // Root
  const root = document.createElement("div");
  root.className = `accordion accordion-${opts.variant} ${opts.className}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;color:#374151;width:100%;
    ${opts.variant === "bordered" ? `border:1px solid ${vs.border};border-radius:${br}px;overflow:hidden;` : ""}
  `;
  container.appendChild(root);

  function render(): void {
    root.innerHTML = "";

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const isOpen = openState.get(item.key) ?? false;
      const isLast = i === items.length - 1;

      // Item wrapper
      const itemEl = document.createElement("div");
      itemEl.className = "accordion-item";
      itemEl.dataset.key = item.key;
      itemEl.style.cssText = `
        ${opts.variant === "separated"
          ? `border-bottom:${isLast ? "none" : `1px solid ${vs.itemBorder}`};`
          : !isLast && opts.variant !== "bordered"
            ? `margin-bottom:${opts.size === "sm" ? "4px" : opts.size === "lg" ? "10px" : "6px"};`
            : ""}
        ${opts.variant !== "bordered" && opts.variant !== "separated" ? "" : ""}
        border-radius:${br}px;
        overflow:hidden;
        background:${vs.bg};
        ${opts.variant === "filled" && isOpen ? "box-shadow:0 1px 3px rgba(0,0,0,0.08);" : ""}
      `;
      if (opts.variant === "default" || opts.variant === "filled") {
        if (!isLast) itemEl.style.marginBottom = opts.size === "sm" ? "2px" : "4px";
      }

      // Header button
      const header = document.createElement("button");
      header.type = "button";
      header.className = "accordion-header";
      header.setAttribute("aria-expanded", String(isOpen));
      header.dataset.key = item.key;
      if (item.disabled) header.disabled = true;
      header.style.cssText = `
        display:flex;align-items:center;width:100%;gap:${sz.gap};
        padding:${sz.padding};
        background:${isOpen && opts.variant === "filled" ? vs.headerBg : vs.headerBg};
        border:none;font-size:${sz.fontSize};font-weight:500;
        color:#374151;cursor:${item.disabled ? "not-allowed" : "pointer"};
        font-family:inherit;text-align:left;line-height:1.5;
        transition:background 0.2s ease;
        ${item.disabled ? "opacity:0.5;" : ""}
      `;

      // Expand/collapse icon
      if (opts.showIcon) {
        const iconSpan = document.createElement("span");
        iconSpan.className = "accordion-icon";
        iconSpan.style.cssText = `
          display:flex;align-items:center;justify-content:center;
          flex-shrink:0;width:${sz.iconSize};height:${sz.iconSize};
          transition:transform 0.25s ease;color:#9ca3af;
          transform:${isOpen ? "rotate(180deg)" : "rotate(0deg)"};
        `;
        iconSpan.innerHTML = "&#9660;"; // ▼
        header.appendChild(iconSpan);
      }

      // Custom icon
      if (item.icon) {
        const customIcon = document.createElement("span");
        customIcon.style.cssText = `display:flex;align-items:center;flex-shrink:0;font-size:${sz.iconSize};`;
        if (typeof item.icon === "string") {
          customIcon.textContent = item.icon;
        } else {
          customIcon.appendChild(item.icon);
        }
        header.appendChild(customIcon);
      }

      // Title
      const titleSpan = document.createElement("span");
      titleSpan.className = "accordion-title";
      titleSpan.textContent = item.title;
      titleSpan.style.flex = "1";
      header.appendChild(titleSpan);

      // Extra content
      if (item.extra) {
        const extraEl = document.createElement("span");
        extraEl.className = "accordion-extra";
        extraEl.style.cssText = `flex-shrink:0;margin-left:auto;display:flex;align-items:center;`;
        if (typeof item.extra === "string") {
          extraEl.textContent = item.extra;
        } else {
          extraEl.appendChild(item.extra);
        }
        header.appendChild(extraEl);
      }

      // Content panel
      const contentPanel = document.createElement("div");
      contentPanel.className = "accordion-content";
      contentPanel.setAttribute("role": "region");
      contentPanel.style.cssText = `
        overflow:hidden;
        transition:max-height 0.3s ease, opacity 0.25s ease;
        max-height:${isOpen ? "1000px" : "0"};
        opacity:${isOpen ? "1" : "0"};
      `;

      const contentInner = document.createElement("div");
      contentInner.className = "accordion-content-inner";
      contentInner.style.cssText = `padding:${sz.padding};font-size:${opts.size === "sm" ? "12px" : "13px"};color:#4b5563;line-height:1.6;`;

      if (item.content) {
        if (typeof item.content === "string") {
          contentInner.innerHTML = item.content;
        } else {
          contentInner.appendChild(item.content);
        }
      } else {
        contentInner.textContent = `Content for "${item.title}"`;
      }

      contentPanel.appendChild(contentInner);

      // Click handler
      header.addEventListener("click", () => {
        if (item.disabled || destroyed) return;
        toggleKey(item.key);
      });

      // Hover effect
      if (!item.disabled) {
        header.addEventListener("mouseenter", () => { header.style.background = vs.headerHoverBg; });
        header.addEventListener("mouseleave", () => { header.style.background = isOpen && opts.variant === "filled" ? vs.headerBg : vs.headerBg; });
      }

      itemEl.appendChild(header);
      itemEl.appendChild(contentPanel);
      root.appendChild(itemEl);
    }
  }

  function toggleKey(key: string): void {
    const item = items.find((t) => t.key === key);
    if (!item || item.disabled) return;

    if (opts.multiple) {
      const current = openState.get(key) ?? false;
      openState.set(key, !current);
    } else {
      // Close all others
      openState.clear();
      openState.set(key, !(openState.get(key) ?? false));
    }

    render();
    const keys = getActiveKeys();
    opts.onChange?.(keys);
  }

  function getActiveKeys(): string[] {
    return items.filter((t) => openState.get(t.key) === true).map((t) => t.key);
  }

  function setActiveKeys(keys: string[]): void {
    openState.clear();
    for (const k of keys) openState.set(k, true);
    render();
    opts.onChange?.(keys);
  }

  render();

  const instance: AccordionInstance = {
    element: root,

    getActiveKeys,

    setActiveKeys,

    toggleKey,

    getItems() { return [...items]; },

    setItems(newItems: AccordionItem[]) {
      items = newItems;
      openState.clear();
      if (!opts.multiple && items.length > 0) {
        openState.set(items[0]!.key, true);
      }
      render();
    },

    addItem(newItem: AccordionItem) {
      items.push(newItem);
      render();
    },

    removeItem(key: string) {
      items = items.filter((t) => t.key !== key);
      openState.delete(key);
      if (!opts.multiple && openState.size === 0 && items.length > 0) {
        openState.set(items[0]!.key, true);
      }
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
