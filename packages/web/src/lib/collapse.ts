/**
 * Collapse: Smooth height animation for showing/hiding content with
 * toggle button, chevron rotation, mount-on-expand (lazy rendering),
 * multiple collapse groups, and accessible ARIA attributes.
 */

// --- Types ---

export type CollapseSize = "sm" | "md" | "lg";
export type CollapseVariant = "default" | "bordered" | "ghost";

export interface CollapseOptions {
  /** Content to show/hide (string, HTMLElement, or render function) */
  content: string | HTMLElement;
  /** Initially expanded? */
  defaultOpen?: boolean;
  /** Header/title for the trigger button */
  header?: string;
  /** Show chevron icon? (default: true) */
  showChevron?: boolean;
  /** Animation duration in ms (default: 250) */
  duration?: number;
  /** Easing function name (default: "ease") */
  easing?: string;
  /** Size variant */
  size?: CollapseSize;
  /** Visual variant */
  variant?: CollapseVariant;
  /** Disabled state */
  disabled?: boolean;
  /** Lazy: only render content when first opened? */
  lazy?: boolean;
  /** Callback on expand */
  onExpand?: () => void;
  /** Callback on collapse */
  onCollapse?: () => void;
  /** Callback on toggle (after animation) */
  onToggle?: (isOpen: boolean) => void;
  /** Custom CSS class */
  className?: string;
  /** Extra padding when open */
  openPadding?: string;
}

export interface CollapseInstance {
  /** Root DOM element */
  element: HTMLDivElement;
  /** Check if currently expanded */
  isOpen: () => boolean;
  /** Expand */
  expand: () => void;
  /** Collapse */
  collapse: () => void;
  /** Toggle */
  toggle: () => void;
  /** Update content dynamically */
  setContent: (content: string | HTMLElement) => void;
  /** Set disabled state */
  setDisabled: (disabled: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Size Config ---

const SIZE_STYLES: Record<CollapseSize, { headerPadding: string; fontSize: number; chevronSize: number }> = {
  sm: { headerPadding: "6px 10px", fontSize: 12, chevronSize: 10 },
  md: { headerPadding: "8px 14px", fontSize: 13, chevronSize: 12 },
  lg: { headerPadding: "10px 18px", fontSize: 14, chevronSize: 14 },
};

// --- Main Class ---

export class CollapseManager {
  create(options: CollapseOptions): CollapseInstance {
    let destroyed = false;
    let isOpen = options.defaultOpen ?? false;
    let hasRendered = !options.lazy;

    const opts = {
      showChevron: options.showChevron ?? true,
      duration: options.duration ?? 250,
      easing: options.easing ?? "ease",
      size: options.size ?? "md",
      variant: options.variant ?? "default",
      disabled: options.disabled ?? false,
      lazy: options.lazy ?? false,
      className: options.className ?? "",
      ...options,
    };

    const sz = SIZE_STYLES[opts.size];

    // Root container
    const root = document.createElement("div");
    root.className = `collapse collapse-${opts.size} ${opts.variant === "bordered" ? "collapse-bordered" : ""} ${opts.className}`;
    root.setAttribute("role", "region");

    // Trigger/header button
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.setAttribute("aria-expanded", String(isOpen));
    trigger.setAttribute("aria-controls", "collapse-content");
    trigger.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;width:100%;
      padding:${sz.headerPadding};background:none;border:none;
      cursor:${opts.disabled ? "not-allowed" : "pointer"};
      font-size:${sz.fontSize}px;font-weight:500;color:#333;
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
      user-select:none;transition:background 0.15s;
    `;

    // Left side: optional header text
    if (options.header) {
      const label = document.createElement("span");
      label.textContent = options.header;
      label.style.cssText = "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      trigger.appendChild(label);
    }

    // Right side: chevron
    if (opts.showChevron) {
      const chevron = document.createElement("span");
      chevron.innerHTML = "&#9660;"; // ▼
      chevron.className = "collapse-chevron";
      chevron.style.cssText = `
        font-size:${sz.chevronSize}px;color:#999;
        transition:transform ${opts.duration}ms ${opts.easing};
        transform:rotate(${isOpen ? "180deg" : "0deg"});
        flex-shrink:0;
      `;
      trigger.appendChild(chevron);
    }

    // Hover effect
    trigger.addEventListener("mouseenter", () => {
      if (!opts.disabled) trigger.style.background = "#f9fafb";
    });
    trigger.addEventListener("mouseleave", () => {
      trigger.style.background = "";
    });

    // Click handler
    trigger.addEventListener("click", () => {
      if (opts.disabled) return;
      instance.toggle();
    });

    root.appendChild(trigger);

    // Content panel
    const contentEl = document.createElement("div");
    contentEl.id = "collapse-content";
    contentEl.setAttribute("role", "region");
    contentEl.setAttribute("aria-labelledby", trigger.id);
    contentEl.className = "collapse-content";

    if (isOpen) {
      contentEl.style.cssText = `
        overflow:hidden;transition:max-height ${opts.duration}ms ${opts.easing};
        max-height:2000px;${opts.openPadding ? `padding:${opts.openPadding}` : ""}
      `;
      renderContent();
    } else {
      contentEl.style.cssText = `
        overflow:hidden;transition:max-height ${opts.duration}ms ${opts.easing};
        max-height:0;
      `;
    }

    root.appendChild(contentEl);

    // Keyboard support
    root.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        instance.toggle();
      }
    });

    function renderContent(): void {
      contentEl.innerHTML = "";
      if (typeof opts.content === "string") {
        contentEl.innerHTML = opts.content;
      } else {
        contentEl.appendChild(opts.content);
      }
      hasRendered = true;
    }

    function updateHeight(): void {
      if (isOpen) {
        const scrollH = contentEl.scrollHeight;
        contentEl.style.maxHeight = `${scrollH}px`;
        // Force reflow
        requestAnimationFrame(() => {
          contentEl.style.maxHeight = `${scrollH}px`;
        });
      } else {
        contentEl.style.maxHeight = "0px";
      }
    }

    const instance: CollapseInstance = {
      element: root,

      isOpen: () => isOpen,

      expand(): void {
        if (isOpen || opts.disabled) return;
        if (opts.onExpand?.() === false) return;
        isOpen = true;
        trigger.setAttribute("aria-expanded", "true");
        updateHeight();
        if (opts.lazy && !hasRendered) renderContent();
        opts.onToggle?.(true);
        requestAnimationFrame(() => {
          const chev = trigger.querySelector(".collapse-chevron");
          if (chev) chev.style.transform = "rotate(180deg)";
        });
      },

      collapse(): void {
        if (!isOpen || opts.disabled) return;
        if (opts.onCollapse?.() === false) return;
        isOpen = false;
        trigger.setAttribute("aria-expanded", "false");
        contentEl.style.maxHeight = "0px";
        opts.onToggle?.(false);
        const chev = trigger.querySelector(".collapse-chevron");
        if (chev) chev.style.transform = "rotate(0deg)";
      },

      toggle(): void {
        if (isOpen) instance.collapse();
        else instance.expand();
      },

      setContent(newContent): void {
        opts.content = newContent;
        hasRendered = false;
        if (isOpen) renderContent();
        updateHeight();
      },

      setDisabled(disabled: boolean): void {
        opts.disabled = disabled;
        trigger.setAttribute("aria-disabled", String(disabled));
        trigger.style.cursor = disabled ? "not-allowed" : "pointer";
      },

      destroy(): void {
        destroyed = true;
        root.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a collapse component */
export function createCollapse(options: CollapseOptions): CollapseInstance {
  return new CollapseManager().create(options);
}

// --- Collapse Group ---

export interface CollapseGroupOptions {
  /** Collapse items in the group */
  items: Array<Omit<CollapseOptions, "content"> & { key: string; content: CollapseOptions["content"] }>;
  /** Allow multiple items open? (default: true for group) */
  multiple?: boolean;
  /** Spacing between items in px */
  spacing?: number;
  /** Custom class for container */
  className?: string;
  /** Parent element */
  parent?: HTMLElement;
}

export interface CollapseGroupInstance {
  element: HTMLDivElement;
  /** Expand item by key */
  expand: (key: string) => void;
  /** Collapse item by key */
  collapse: (key: string) => void;
  /** Expand all */
  expandAll: () => void;
  /** Collapse all */
  collapseAll: () => void;
  /** Get open keys */
  getOpenKeys: () => string[];
  /** Destroy */
  destroy: () => void;
}

/**
 * Create a group of collapses that can optionally enforce single-open mode.
 */
export function createCollapseGroup(options: CollapseGroupOptions): CollapseGroupInstance {
  const parent = options.parent ?? document.body;
  const spacing = options.spacing ?? 4;
  const multiple = options.multiple ?? true;

  const container = document.createElement("div");
  container.className = `collapse-group ${options.className ?? ""}`;
  container.style.cssText = `display:flex;flex-direction:column;gap:${spacing}px}`;

  const instances = new Map<string, CollapseInstance>();

  for (const item of options.items) {
    const inst = createCollapse({
      ...item,
      parent: container,
    } as CollapseOptions);
    instances.set(item.key, inst);
    container.appendChild(inst.element);
  }

  return {
    element: container,

    expand(key: string) {
      if (!multiple) {
        // Close others first
        for (const [k, inst] of instances) {
          if (k !== key) inst.collapse();
        }
      }
      instances.get(key)?.expand();
    },

    collapse(key: string) {
      instances.get(key)?.collapse();
    },

    expandAll() {
      for (const [, inst] of instances) inst.expand();
    },

    collapseAll() {
      for (const [, inst] of instances) inst.collapse();
    },

    getOpenKeys: () =>
      Array.from(instances.entries()).filter(([, inst]) => inst.isOpen()).map(([k]) => k),

    destroy() {
      for (const [, inst] of instances) inst.destroy();
      container.remove();
    },
  };
}
