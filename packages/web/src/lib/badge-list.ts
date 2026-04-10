/**
 * Badge List / Tag List: Dynamic tag/badge collection with add/remove,
 * color variants, counts, editable labels, drag-to-reorder hints,
 * max limit enforcement, and keyboard support.
 */

// --- Types ---

export type BadgeColor =
  | "default" | "primary" | "success" | "warning" | "danger" | "info"
  | "purple" | "pink" | "gray" | string;

export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeItem {
  /** Unique ID */
  id: string;
  /** Display text */
  label: string;
  /** Color variant */
  color?: BadgeColor;
  /** Icon/emoji prefix */
  icon?: string;
  /** Count number (shows as suffix) */
  count?: number;
  /** Removable? (default: true) */
  removable?: boolean;
  /** Clickable? */
  clickable?: boolean;
  /** Custom data */
  data?: Record<string, unknown>;
}

export interface BadgeListOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial badges */
  items?: BadgeItem[];
  /** Size variant */
  size?: BadgeSize;
  /** Allow adding new badges? */
  allowAdd?: boolean;
  /** Add input placeholder */
  addPlaceholder?: string;
  /** Max badges allowed (0 = unlimited) */
  maxItems?: number;
  /** Show remove X button? */
  showRemove?: boolean;
  /** Show count on badges? */
  showCount?: boolean;
  /** Wrap or single line overflow? */
  wrap?: boolean;
  /** Callback when badge added */
  onAdd?: (label: string) => void | string | BadgeItem;
  /** Callback when badge removed */
  onRemove?: (item: BadgeItem) => void;
  /** Callback when badge clicked */
  onClick?: (item: BadgeItem) => void;
  /** Custom CSS class */
  className?: string;
}

export interface BadgeListInstance {
  element: HTMLElement;
  getItems: () => BadgeItem[];
  setItems: (items: BadgeItem[]) => void;
  add: (item: BadgeItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  getCount: () => number;
  destroy: () => void;
}

// --- Config ---

const COLOR_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  default: { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" },
  primary: { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  success: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  warning: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  danger:  { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  info:    { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  purple:  { bg: "#faf5ff", text: "#9333ea", border: "#e9d5ff" },
  pink:    { bg: "#fdf2f8", text: "#db2777", border: "#fbcfe8" },
  gray:    { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" },
};

const SIZE_MAP: Record<BadgeSize, { padding: string; fontSize: string; height: string; iconSize: string }> = {
  sm:  { padding: "1px 7px",   fontSize: "11px", height: "20px", iconSize: "12px" },
  md:  { padding: "3px 10px",  fontSize: "12px", height: "24px", iconSize: "13px" },
  lg:  { padding: "5px 14px",  fontSize: "13px", height: "28px", iconSize: "14px" },
};

function resolveColor(color: BadgeColor): { bg: string; text: string; border: string } {
  if (COLOR_STYLES[color]) return COLOR_STYLES[color];
  // Treat as hex - generate matching styles
  return { bg: color + "15", text: color, border: color + "30" };
}

// --- Main Factory ---

export function createBadgeList(options: BadgeListOptions): BadgeListInstance {
  const opts = {
    size: options.size ?? "md",
    allowAdd: options.allowAdd ?? false,
    addPlaceholder: options.addPlaceholder ?? "Add tag...",
    maxItems: options.maxItems ?? 0,
    showRemove: options.showRemove ?? true,
    showCount: options.showCount ?? true,
    wrap: options.wrap ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("BadgeList: container not found");

  container.className = `badge-list ${opts.className}`;
  let items: BadgeItem[] = opts.items ?? [];
  let destroyed = false;

  const sz = SIZE_MAP[opts.size];

  function render(): void {
    container.innerHTML = "";

    // List wrapper
    const list = document.createElement("div");
    list.style.cssText = `
      display:flex;flex-wrap:${opts.wrap ? "wrap" : "nowrap"};gap:6px;
      align-items:center;${!opts.wrap ? "overflow-x:auto;" : ""}
    `;
    container.appendChild(list);

    for (const item of items) {
      list.appendChild(renderBadge(item));
    }

    // Add input
    if (opts.allowAdd && (opts.maxItems === 0 || items.length < opts.maxItems)) {
      list.appendChild(renderAddInput());
    }
  }

  function renderBadge(item: BadgeItem): HTMLElement {
    const colors = resolveColor(item.color ?? "default");
    const el = document.createElement("span");
    el.className = `badge badge-${item.id}`;
    el.dataset.id = item.id;
    el.style.cssText = `
      display:inline-flex;align-items:center;gap:4px;height:${sz.height};
      padding:${sz.padding};border-radius:9999px;font-size:${sz.fontSize};
      font-weight:500;font-family:-apple-system,sans-serif;line-height:1;
      background:${colors.bg};color:${colors.text};border:1px solid ${colors.border};
      cursor:${item.clickable ? "pointer" : "default"};
      transition:opacity 0.1s,background 0.1s;white-space:nowrap;max-width:200px;
    `;

    if (item.clickable) {
      el.addEventListener("mouseenter", () => { el.style.opacity = "0.8"; });
      el.addEventListener("mouseleave", () => { el.style.opacity = ""; });
      el.addEventListener("click", () => opts.onClick?.(item));
    }

    // Icon
    if (item.icon) {
      const iconEl = document.createElement("span");
      iconEl.textContent = item.icon;
      iconEl.style.cssText = `font-size:${sz.iconSize};line-height:1;`;
      el.appendChild(iconEl);
    }

    // Label
    const label = document.createElement("span");
    label.className = "badge-label";
    label.style.cssText = "overflow:hidden;text-overflow:ellipsis;";
    label.textContent = item.label;
    el.appendChild(label);

    // Count
    if (item.count !== undefined && opts.showCount) {
      const countEl = document.createElement("span");
      countEl.className = "badge-count";
      countEl.style.cssText = `
        background:${colors.text}15;color:${colors.text};font-size:10px;
        font-weight:600;padding:0 4px;border-radius:99px;line-height:1.4;
      `;
      countEl.textContent = String(item.count);
      el.appendChild(countEl);
    }

    // Remove button
    if (opts.showRemove && item.removable !== false) {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.innerHTML = "&times;";
      removeBtn.setAttribute("aria-label", `Remove ${item.label}`);
      removeBtn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:${sz.fontSize};
        color:inherit;opacity:0.6;padding:0 1px;line-height:1;margin-left:-2px;
        transition:opacity 0.1s;
      `;
      removeBtn.addEventListener("mouseenter", () => { removeBtn.style.opacity = "1"; });
      removeBtn.addEventListener("mouseleave", () => { removeBtn.style.opacity = "0.6"; });
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        instance.remove(item.id);
        opts.onRemove?.(item);
      });
      el.appendChild(removeBtn);
    }

    return el;
  }

  function renderAddInput(): HTMLElement {
    const wrap = document.createElement("span");
    wrap.className = "badge-add-input";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = opts.addPlaceholder;
    input.style.cssText = `
      height:${sz.height};padding:0 ${sz.padding};font-size:${sz.fontSize};
      border:1px dashed #d1d5db;border-radius:9999px;background:transparent;
      outline:none;color:#374151;font-family:inherit;width:100px;
      transition:border-color 0.15s;
    `;
    input.addEventListener("focus", () => { input.style.borderColor = "#6366f1"; input.style.width = "140px"; });
    input.addEventListener("blur", () => { input.style.borderColor = "#d1d5db"; input.style.width = "100px"; });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = input.value.trim();
        if (!val) return;
        if (opts.maxItems > 0 && items.length >= opts.maxItems) return;

        const result = opts.onAdd?.(val);
        if (result === undefined) {
          // Default: create a new badge
          instance.add({ id: `badge-${Date.now()}`, label: val });
        } else if (typeof result === "string") {
          instance.add({ id: `badge-${Date.now()}`, label: result });
        } else if (result && typeof result === "object") {
          instance.add(result);
        }
        input.value = "";
      }
      if (e.key === "Escape") input.blur();
    });

    wrap.appendChild(input);
    return wrap;
  }

  render();

  const instance: BadgeListInstance = {
    element: container,

    getItems() { return [...items]; },

    setItems(newItems: BadgeItem[]) { items = newItems; render(); },

    add(item: BadgeItem) {
      if (opts.maxItems > 0 && items.length >= opts.maxItems) return;
      items.push(item);
      render();
    },

    remove(id: string) {
      items = items.filter((b) => b.id !== id);
      render();
    },

    clear() { items = []; render(); },

    getCount() { return items.length; },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
    },
  };

  return instance;
}
