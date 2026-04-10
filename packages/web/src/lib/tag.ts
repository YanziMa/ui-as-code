/**
 * Tag Component: Closable tags with variants (filled, outlined, ghost),
 * sizes, icons, color customization, checkable state, grouped layout,
 * and animation.
 */

// --- Types ---

export type TagVariant = "default" | "primary" | "success" | "warning" | "error" | "info";
export type TagSize = "sm" | "md" | "lg";
export type TagShape = "rounded" | "pill" | "square";

export interface TagOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Tag content (text or HTML) */
  children?: string | HTMLElement;
  /** Color variant */
  variant?: TagVariant;
  /** Size */
  size?: TagSize;
  /** Shape style */
  shape?: TagShape;
  /** Closable? */
  closable?: boolean;
  /** Icon prefix (emoji or SVG string) */
  icon?: string;
  /** Icon suffix (e.g., arrow) */
  suffixIcon?: string;
  /** Custom background color */
  color?: string;
  /** Custom text color */
  textColor?: string;
  /** Checkable/selected state */
  checked?: boolean;
  /** Callback on close */
  onClose?: () => void;
  /** Callback on click (for checkable tags) */
  onClick?: (checked: boolean) => void;
  /** Custom CSS class */
  className?: string;
}

export interface TagInstance {
  element: HTMLSpanElement;
  /** Close the tag */
  close: () => void;
  /** Set checked state */
  setChecked: (checked: boolean) => void;
  /** Update tag text/content */
  setContent: (content: string | HTMLElement) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Config ---

const VARIANT_STYLES: Record<TagVariant, { bg: string; color: string; border: string }> = {
  default: { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
  primary: { bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe" },
  success: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
  warning: { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
  error:   { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
  info:    { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" },
};

const SIZE_STYLES: Record<TagSize, {
  fontSize: number;
  paddingX: number;
  paddingY: number;
  iconSize: number;
  gap: number;
}> = {
  sm: { fontSize: 12, paddingX: 6, paddingY: 1, iconSize: 13, gap: 4 },
  md: { fontSize: 13, paddingX: 8, paddingY: 2, iconSize: 14, gap: 5 },
  lg: { fontSize: 14, paddingX: 10, paddingY: 3, iconSize: 16, gap: 6 },
};

// --- Main Class ---

export class TagManager {
  create(options: TagOptions): TagInstance {
    const opts = {
      variant: options.variant ?? "default",
      size: options.size ?? "md",
      shape: options.shape ?? "rounded",
      closable: options.closable ?? false,
      checked: options.checked ?? false,
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Tag: container not found");

    const vs = VARIANT_STYLES[opts.variant];
    const sz = SIZE_STYLES[opts.size];
    let destroyed = false;

    // Create tag element
    const el = document.createElement("span");
    el.className = `tag tag-${opts.variant} tag-${opts.size} tag-${opts.shape} ${opts.className}`;
    el.style.cssText = `
      display:inline-flex;align-items:center;gap:${sz.gap}px;
      font-size:${sz.fontSize}px;font-weight:500;line-height:1.5;
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
      white-space:nowrap;vertical-align:middle;
      max-width:100%;overflow:hidden;
      ${buildTagStyle(vs, sz, opts)};
      transition:opacity 0.15s, transform 0.15s;
    `;

    // Prefix icon
    if (opts.icon) {
      const iconEl = document.createElement("span");
      iconEl.className = "tag-icon";
      iconEl.textContent = opts.icon;
      iconEl.style.cssText = `font-size:${sz.iconSize}px;line-height:1;flex-shrink:0;display:inline-flex;`;
      el.appendChild(iconEl);
    }

    // Content
    const contentWrap = document.createElement("span");
    contentWrap.className = "tag-content";
    contentWrap.style.cssText = "overflow:hidden;text-overflow:ellipsis;";
    if (opts.children) {
      if (typeof opts.children === "string") {
        contentWrap.textContent = opts.children;
      } else {
        contentWrap.appendChild(opts.children);
      }
    }
    el.appendChild(contentWrap);

    // Suffix icon
    if (opts.suffixIcon) {
      const suffixEl = document.createElement("span");
      suffixEl.className = "tag-suffix";
      suffixEl.textContent = opts.suffixIcon;
      suffixEl.style.cssText = `font-size:${sz.iconSize}px;line-height:1;flex-shrink:0;display:inline-flex;color:${vs.color};opacity:0.7;`;
      el.appendChild(suffixEl);
    }

    // Close button
    let closeBtn: HTMLButtonElement | null = null;
    if (opts.closable) {
      closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "&times;";
      closeBtn.setAttribute("aria-label", "Remove tag");
      closeBtn.style.cssText = `
        display:inline-flex;align-items:center;justify-content:center;
        width:${sz.fontSize + 8}px;height:${sz.fontSize + 8}px;border-radius:50%;
        background:none;border:none;cursor:pointer;font-size:${sz.fontSize + 2}px;
        line-height:1;color:${vs.color};opacity:0.5;padding:0;margin-left:-2px;
        flex-shrink:0;transition:background 0.15s, opacity 0.15s;
      `;
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        instance.close();
      });
      closeBtn.addEventListener("mouseenter", () => { closeBtn!.style.background = `${vs.color}20`; closeBtn!.style.opacity = "1"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn!.style.background = ""; closeBtn!.style.opacity = "0.5"; });
      el.appendChild(closeBtn);
    }

    // Click handler for checkable
    let checkedState = opts.checked;
    if (opts.onClick) {
      el.style.cursor = "pointer";
      el.addEventListener("click", () => {
        checkedState = !checkedState;
        instance.setChecked(checkedState);
        opts.onClick!(checkedState);
      });
      el.addEventListener("mouseenter", () => { el.style.opacity = "0.85"; });
      el.addEventListener("mouseleave", () => { el.style.opacity = ""; });
    }

    container.appendChild(el);

    function buildTagStyle(
      vs: typeof VARIANT_STYLES[TagVariant],
      sz: typeof SIZE_STYLES[TagSize],
      o: typeof opts,
    ): string {
      const bg = o.color ?? vs.bg;
      const color = o.textColor ?? vs.color;
      const radius = o.shape === "pill" ? "999px" : o.shape === "square" ? "2px" : "4px";

      return `
        background:${bg};color:${color};
        border:1px solid ${o.color ? "transparent" : vs.border};
        border-radius:${radius};
        padding:${sz.paddingY}px ${sz.paddingX}px;
        ${o.checked && opts.onClick ? `box-shadow:inset 0 0 0 1.5px ${color};` : ""}
      `;
    }

    const instance: TagInstance = {
      element: el,

      close(): void {
        if (destroyed) return;
        el.style.opacity = "0";
        el.style.transform = "scale(0.8)";
        setTimeout(() => {
          el.remove();
          opts.onClose?.();
        }, 150);
      },

      setChecked(checked: boolean): void {
        checkedState = checked;
        el.style.cssText += checked && opts.onClick
          ? `box-shadow:inset 0 0 0 1.5px ${vs.color};`
          : `box-shadow:none;`;
      },

      setContent(content: string | HTMLElement): void {
        contentWrap.innerHTML = "";
        if (typeof content === "string") {
          contentWrap.textContent = content;
        } else {
          contentWrap.appendChild(content);
        }
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;
        el.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a tag */
export function createTag(options: TagOptions): TagInstance {
  return new TagManager().create(options);
}

// --- Tag Group ---

export interface TagGroupOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Tags to render */
  items: Array<Omit<TagOptions, "container"> & { key: string }>;
  /** Max width before wrapping? */
  maxWidth?: number;
  /** Gap between tags in px */
  gap?: number;
  /** Allow multiple selection? */
  multiple?: boolean;
  /** Callback when selection changes */
  onChange?: (selectedKeys: string[]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface TagGroupInstance {
  element: HTMLDivElement;
  getSelected: () => string[];
  setSelected: (keys: string[]) => void;
  addTag: (item: Omit<TagOptions, "container"> & { key: string }) => void;
  removeTag: (key: string) => void;
  destroy: () => void;
}

/**
 * Create a group of tags with optional selection.
 */
export function createTagGroup(options: TagGroupOptions): TagGroupInstance {
  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("TagGroup: container not found");

  const gap = options.gap ?? 6;
  const selectedKeys = new Set<string>();

  const root = document.createElement("div");
  root.className = `tag-group ${options.className ?? ""}`;
  root.style.cssText = `display:flex;flex-wrap:wrap;gap:${gap}px;align-items:center;`;

  const instances = new Map<string, TagInstance>();

  function render(): void {
    root.innerHTML = "";
    instances.clear();

    for (const item of options.items) {
      const inst = createTag({
        ...item,
        container: root as unknown as HTMLElement,
        checked: selectedKeys.has(item.key),
        onClick: options.onChange
          ? (checked) => {
              if (options.multiple !== false || !selectedKeys.has(item.key)) {
                if (checked) selectedKeys.add(item.key);
                else selectedKeys.delete(item.key);
                if (options.multiple === false && checked) {
                  // Single select: uncheck others
                  for (const [k, i] of instances) {
                    if (k !== item.key) i.setChecked(false);
                    selectedKeys.delete(k);
                  }
                  selectedKeys.add(item.key);
                }
                render();
                options.onChange?.([...selectedKeys]);
              }
            }
          : undefined,
      });
      instances.set(item.key, inst);
      root.appendChild(inst.element);
    }
  }

  container.appendChild(root);
  render();

  return {
    element: root,

    getSelected() { return [...selectedKeys]; },

    setSelected(keys: string[]) {
      selectedKeys.clear();
      keys.forEach((k) => selectedKeys.add(k));
      render();
    },

    addTag(item) {
      options.items.push(item);
      render();
    },

    removeTag(key: string) {
      options.items = options.items.filter((i) => i.key !== key);
      selectedKeys.delete(key);
      render();
    },

    destroy() {
      root.remove();
    },
  };
}
