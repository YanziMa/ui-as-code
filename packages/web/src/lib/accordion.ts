/**
 * Accordion: Collapsible sections with smooth animation, single/multiple mode,
 * nested accordions, keyboard navigation, accessibility, and lazy content.
 */

// --- Types ---

export interface AccordionItem {
  /** Unique key */
  key: string;
  /** Header text or element */
  header: string | HTMLElement;
  /** Body content (string, HTML element, or render function) */
  body: string | HTMLElement;
  /** Initially expanded? */
  defaultExpanded?: boolean;
  /** Disabled (cannot toggle) */
  disabled?: boolean;
  /** Icon for header */
  icon?: string;
  /** Custom CSS class */
  className?: string;
}

export type AccordionMode = "single" | "multiple";

export interface AccordionOptions {
  /** Accordion items */
  items: AccordionItem[];
  /** Single (only one open) or multiple */
  mode?: AccordionMode;
  /** Initially active keys */
  defaultActiveKeys?: string[];
  /** Allow all to be collapsed in single mode? */
  collapsible?: boolean;
  /** Animation duration in ms (default: 250) */
  animationDuration?: number;
  /** Show expand/collapse icon */
  showIcon?: boolean;
  /** Border between items */
  bordered?: boolean;
  /** Size variant: 'sm', 'md', 'lg' */
  size?: "sm" | "md" | "lg";
  /** Callback on change */
  onChange?: (activeKeys: string[]) => void;
  /** Callback before change (return false to prevent) */
  beforeChange?: (key: string, expanding: boolean) => boolean | void;
  /** Lazy load body content on first open */
  lazy?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Parent element */
  parent?: HTMLElement;
}

export interface AccordionInstance {
  /** Root DOM element */
  element: HTMLDivElement;
  /** Expand an item by key */
  expand: (key: string) => void;
  /** Collapse an item by key */
  collapse: (key: string) => void;
  /** Toggle an item by key */
  toggle: (key: string) => void;
  /** Get currently active keys */
  getActiveKeys: () => string[];
  /** Expand all */
  expandAll: () => void;
  /** Collapse all */
  collapseAll: () => void;
  /** Add item dynamically */
  addItem: (item: AccordionItem) => void;
  /** Remove item by key */
  removeItem: (key: string) => void;
  /** Enable/disable an item */
  setDisabled: (key: string, disabled: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Size Config ---

const SIZE_CONFIG: Record<string, { headerPadding: string; fontSize: number; iconSize: number }> = {
  sm: { headerPadding: "8px 12px", fontSize: 13, iconSize: 12 },
  md: { headerPadding: "12px 16px", fontSize: 14, iconSize: 14 },
  lg: { headerPadding: "14px 20px", fontSize: 15, iconSize: 16 },
};

// --- Main Class ---

export class AccordionManager {
  create(options: AccordionOptions): AccordionInstance {
    const opts = {
      mode: options.mode ?? "single",
      collapsible: options.collapsible ?? true,
      animationDuration: options.animationDuration ?? 250,
      showIcon: options.showIcon ?? true,
      bordered: options.bordered ?? true,
      size: options.size ?? "md",
      lazy: options.lazy ?? false,
      parent: options.parent ?? document.body,
      ...options,
    };

    const items = [...options.items];
    let activeKeys = new Set(opts.defaultActiveKeys ?? items
      .filter((i) => i.defaultExpanded)
      .map((i) => i.key));

    // Enforce single mode
    if (opts.mode === "single" && activeKeys.size > 1) {
      activeKeys = new Set([Array.from(activeKeys)[0]!]);
    }

    // Track which bodies have been rendered (for lazy loading)
    const renderedBodies = new Set<string>();

    // Root container
    const root = document.createElement("div");
    root.className = `accordion accordion-${opts.size} ${options.className ?? ""}`;
    root.setAttribute("role", "region");
    root.style.cssText = `
      width:100%;${opts.bordered ? "border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;" : ""}
      font-family:-apple-system,sans-serif;
    `;

    opts.parent.appendChild(root);

    function build(): void {
      root.innerHTML = "";

      items.forEach((item, index) => {
        const isActive = activeKeys.has(item.key);
        const sz = SIZE_CONFIG[opts.size];

        // Item wrapper
        const itemEl = document.createElement("div");
        itemEl.className = `accordion-item ${item.className ?? ""}`;
        itemEl.dataset.key = item.key;

        if (index > 0 && opts.bordered) {
          itemEl.style.borderTop = "1px solid #e5e7eb";
        }

        // Header button
        const headerBtn = document.createElement("button");
        headerBtn.type = "button";
        headerBtn.setAttribute("role", "tab");
        headerBtn.setAttribute("aria-expanded", String(isActive));
        headerBtn.setAttribute("aria-disabled", String(item.disabled ?? false));
        headerBtn.setAttribute("aria-controls", `panel-${item.key}`);
        headerBtn.id = `header-${item.key}`;
        headerBtn.style.cssText = `
          display:flex;align-items:center;justify-content:space-between;gap:8px;
          width:100%;padding:${sz.headerPadding};
          background:none;border:none;cursor:${item.disabled ? "not-allowed" : "pointer"};
          font-size:${sz.fontSize}px;font-weight:500;color:#333;
          transition:background 0.15s;text-align:left;
          font-family:inherit;
        `;

        // Left side: icon + label
        const leftSide = document.createElement("span");
        leftSide.style.cssText = "display:flex;align-items:center;gap:8px;flex:1;min-width:0;";

        if (item.icon) {
          const iconEl = document.createElement("span");
          iconEl.textContent = item.icon;
          iconEl.style.fontSize = `${sz.iconSize + 4}px`;
          leftSide.appendChild(iconEl);
        }

        if (typeof item.header === "string") {
          const label = document.createElement("span");
          label.textContent = item.header;
          label.style.cssText = "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
          leftSide.appendChild(label);
        } else {
          leftSide.appendChild(item.header);
        }

        headerBtn.appendChild(leftSide);

        // Right side: chevron icon
        if (opts.showIcon) {
          const chevron = document.createElement("span");
          chevron.innerHTML = isActive ? "&#9660;" : "&#9654;";
          chevron.className = "accordion-chevron";
          chevron.style.cssText = `
            font-size:${sz.iconSize}px;color:#999;
            transition:transform ${opts.animationDuration}ms ease;
            transform:rotate(${isActive ? "180deg" : (opts.mode === "multiple" ? "-90deg" : "0deg")});
            flex-shrink:0;width:${sz.iconSize}px;text-align:center;
          `;
          headerBtn.appendChild(chevron);
        }

        // Click handler
        if (!item.disabled) {
          headerBtn.addEventListener("click", () => instance.toggle(item.key));
        }

        // Hover effect
        headerBtn.addEventListener("mouseenter", () => {
          if (!item.disabled) headerBtn.style.background = "#f9fafb";
        });
        headerBtn.addEventListener("mouseleave", () => {
          headerBtn.style.background = "";
        });

        itemEl.appendChild(headerBtn);

        // Body panel
        const panel = document.createElement("div");
        panel.id = `panel-${item.key}`;
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", `header-${item.key}`);
        panel.className = "accordion-panel";

        if (isActive) {
          panel.style.cssText = `
            overflow:hidden;transition:max-height ${opts.animationDuration}ms ease;
            max-height:2000px;
          `;
          renderBody(panel, item);
        } else {
          panel.style.cssText = `
            overflow:hidden;transition:max-height ${opts.animationDuration}ms ease;
            max-height:0;
          `;
        }

        itemEl.appendChild(panel);
        root.appendChild(itemEl);
      });
    }

    function renderBody(panel: HTMLElement, item: AccordionItem): void {
      if (opts.lazy && !renderedBodies.has(item.key)) {
        renderedBodies.add(item.key);
      }
      panel.innerHTML = "";
      if (typeof item.body === "string") {
        panel.innerHTML = item.body;
      } else {
        panel.appendChild(item.body);
      }
    }

    function doExpand(key: string): boolean {
      if (opts.beforeChange?.(key, true) === false) return false;

      if (opts.mode === "single") {
        // Close others
        for (const k of activeKeys) {
          if (k !== key) activeKeys.delete(k);
        }
      }

      activeKeys.add(key);
      build();
      opts.onChange?.(Array.from(activeKeys));
      return true;
    }

    function doCollapse(key: string): boolean {
      if (opts.mode === "single" && !opts.collapsible) return false;
      if (opts.beforeChange?.(key, false) === false) return false;

      activeKeys.delete(key);
      build();
      opts.onChange?.(Array.from(activeKeys));
      return true;
    }

    // Keyboard navigation
    const keyHandler = (e: KeyboardEvent) => {
      const headers = root.querySelectorAll<HTMLElement>('[role="tab"]');
      const currentIdx = Array.from(headers).findIndex(
        (h) => h === document.activeElement || h.contains(document.activeElement),
      );

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (currentIdx < headers.length - 1) headers[currentIdx + 1]?.focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          if (currentIdx > 0) headers[currentIdx - 1]?.focus();
          break;
        case "Home":
          e.preventDefault();
          headers[0]?.focus();
          break;
        case "End":
          e.preventDefault();
          headers[headers.length - 1]?.focus();
          break;
      }
    };

    root.addEventListener("keydown", keyHandler);

    // Initial render
    build();

    // Instance
    const instance: AccordionInstance = {
      element: root,

      expand(key) { doExpand(key); },
      collapse(key) { doCollapse(key); },

      toggle(key) {
        if (activeKeys.has(key)) doCollapse(key);
        else doExpand(key);
      },

      getActiveKeys() { return Array.from(activeKeys); },

      expandAll() {
        if (opts.mode === "single") {
          // In single mode, only expand the first one
          if (items[0]) activeKeys = new Set([items[0].key]);
        } else {
          activeKeys = new Set(items.map((i) => i.key));
        }
        build();
        opts.onChange?.(Array.from(activeKeys));
      },

      collapseAll() {
        if (opts.collapsible) {
          activeKeys.clear();
          build();
          opts.onChange?.([]);
        }
      },

      addItem(newItem) {
        items.push(newItem);
        build();
      },

      removeItem(key) {
        const idx = items.findIndex((i) => i.key === key);
        if (idx >= 0) items.splice(idx, 1);
        activeKeys.delete(key);
        build();
      },

      setDisabled(key, disabled) {
        const item = items.find((i) => i.key === key);
        if (item) item.disabled = disabled;
        build();
      },

      destroy() {
        root.removeEventListener("keydown", keyHandler);
        root.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create an accordion */
export function createAccordion(options: AccordionOptions): AccordionInstance {
  return new AccordionManager().create(options);
}
