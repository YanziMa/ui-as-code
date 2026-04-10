/**
 * Avatar Group / Stack: Clustered avatars with overflow count, sizes, ring styles,
 * hover tooltips, click handlers, stacking direction, and responsive behavior.
 */

// --- Types ---

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type StackDirection = "horizontal" | "vertical";

export interface AvatarItem {
  /** Image URL or null for fallback */
  src?: string | null;
  /** Fallback text (initials) */
  fallback?: string;
  /** Full name for tooltip */
  name?: string;
  /** Custom color for fallback background */
  color?: string;
  /** Click handler */
  onClick?: () => void;
  /** Status indicator */
  status?: "online" | "offline" | "away" | "busy";
  /** Unique ID */
  id?: string;
}

export interface AvatarGroupOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Avatar items */
  items: AvatarItem[];
  /** Size variant */
  size?: AvatarSize;
  /** Maximum visible avatars before showing +N overflow */
  maxVisible?: number;
  /** Show overflow count badge? */
  showOverflow?: boolean;
  /** Ring/border style */
  ring?: boolean;
  /** Ring color */
  ringColor?: string;
  /** Stack overlap amount (px, negative = overlap) */
  overlap?: number;
  /** Stack direction */
  direction?: StackDirection;
  /** Shape: circle or rounded-square */
  shape?: "circle" | "rounded";
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Callback on avatar click */
  onItemClick?: (item: AvatarItem, index: number) => void;
  /** Callback on overflow click */
  onOverflowClick?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface AvatarGroupInstance {
  element: HTMLElement;
  getItems: () => AvatarItem[];
  setItems: (items: AvatarItem[]) => void;
  addItem: (item: AvatarItem) => void;
  removeItem: (index: number) => void;
  updateItem: (index: number, updates: Partial<AvatarItem>) => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_MAP: Record<AvatarSize, { size: number; fontSize: number; statusSize: number }> = {
  xs: { size: 20, fontSize: 8, statusSize: 5 },
  sm: { size: 24, fontSize: 9, statusSize: 6 },
  md: { size: 32, fontSize: 11, statusSize: 8 },
  lg: { size: 40, fontSize: 13, statusSize: 10 },
  xl: { size: 48, fontSize: 15, statusSize: 12 },
};

const STATUS_COLORS: Record<string, string> = {
  online: "#22c55e",
  offline: "#9ca3af",
  away: "#f59e0b",
  busy: "#ef4444",
};

/** Generate a consistent color from a string */
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

// --- Main Class ---

export class AvatarGroupManager {
  create(options: AvatarGroupOptions): AvatarGroupInstance {
    const opts = {
      size: options.size ?? "md",
      maxVisible: options.maxVisible ?? 4,
      showOverflow: options.showOverflow ?? true,
      ring: options.ring ?? true,
      ringColor: options.ringColor ?? "#fff",
      overlap: options.overlap ?? -8,
      direction: options.direction ?? "horizontal",
      shape: options.shape ?? "circle",
      showTooltip: options.showTooltip ?? true,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("AvatarGroup: container element not found");

    let items = [...options.items];
    let destroyed = false;

    container.className = `avatar-group avatar-group-${opts.direction} ${opts.className ?? ""}`;
    container.style.cssText = `
      display:flex;${opts.direction === "horizontal" ? "flex-direction:row;" : "flex-direction:column;"}
      align-items:center;gap:${Math.abs(opts.overlap)}px;
      ${opts.direction === "horizontal" ? "" : "flex-wrap:nowrap;"}
    `;

    function render(): void {
      container.innerHTML = "";

      const sz = SIZE_MAP[opts.size];
      const visibleItems = items.slice(0, opts.maxVisible);
      const overflowCount = items.length - opts.maxVisible;

      // Render each visible avatar
      visibleItems.forEach((item, index) => {
        const avatarEl = createAvatar(item, index);
        if (opts.direction === "horizontal" && index > 0) {
          avatarEl.style.marginLeft = `${opts.overlap}px`;
        } else if (opts.direction === "vertical" && index > 0) {
          avatarEl.style.marginTop = `${opts.overlap}px`;
        }
        container.appendChild(avatarEl);
      });

      // Overflow badge
      if (overflowCount > 0 && opts.showOverflow) {
        const overflow = createOverflowBadge(overflowCount, sz.size);
        if (opts.direction === "horizontal" && visibleItems.length > 0) {
          overflow.style.marginLeft = `${opts.overlap}px`;
        }
        container.appendChild(overflow);
      }
    }

    function createAvatar(item: AvatarItem, index: number): HTMLElement {
      const sz = SIZE_MAP[opts.size];

      const wrapper = document.createElement("div");
      wrapper.className = "avatar-wrapper";
      wrapper.style.cssText = `
        position:relative;flex-shrink:0;width:${sz.size}px;height:${sz.size}px;
        cursor:${item.onClick || opts.onItemClick ? "pointer" : "default"};
        transition:transform 0.15s ease;z-index:${index + 1};
      `;

      // Ring
      if (opts.ring) {
        wrapper.style.border = `2px solid ${opts.ringColor}`;
      }

      const el = document.createElement("div");
      el.className = "avatar";

      if (opts.shape === "circle") {
        el.style.borderRadius = "50%";
      } else {
        el.style.borderRadius = `${sz.size / 5}px`;
      }

      el.style.cssText += `
        width:100%;height:100%;overflow:hidden;display:flex;align-items:center;
        justify-content:center;font-weight:600;font-size:${sz.fontSize}px;color:#fff;
        background:${item.color ?? (item.fallback ? stringToColor(item.fallback) : "#d1d5db")};
        object-fit:cover;background-size:cover;background-position:center;
        user-select:none;
      `;

      if (item.src) {
        el.style.backgroundImage = `url(${item.src})`;
      } else if (item.fallback) {
        el.textContent = item.fallback.slice(0, 2).toUpperCase();
      } else {
        el.textContent = "?";
      }

      wrapper.appendChild(el);

      // Status indicator
      if (item.status) {
        const statusDot = document.createElement("div");
        statusDot.className = "avatar-status";
        statusDot.style.cssText = `
          position:absolute;bottom:-1px;right:-1px;width:${sz.statusSize}px;height:${sz.statusSize}px;
          border-radius:50%;background:${STATUS_COLORS[item.status] ?? STATUS_COLORS.offline};
          border:2px solid ${opts.shape === "circle" ? opts.ringColor : "transparent"};
          z-index:2;
        `;
        wrapper.appendChild(statusDot);
      }

      // Tooltip
      if (opts.showTooltip && item.name) {
        wrapper.title = item.name;
      }

      // Click handler
      if (!item.onClick && opts.onItemClick) {
        wrapper.addEventListener("click", () => opts.onItemClick!(item, index));
      } else if (item.onClick) {
        wrapper.addEventListener("click", item.onClick);
      }

      // Hover effect
      wrapper.addEventListener("mouseenter", () => {
        wrapper.style.transform = "scale(1.08)";
        wrapper.style.zIndex = String(items.length + 10);
      });
      wrapper.addEventListener("mouseleave", () => {
        wrapper.style.transform = "";
        wrapper.style.zIndex = String(index + 1);
      });

      return wrapper;
    }

    function createOverflowBadge(count: number, size: number): HTMLElement {
      const sz = SIZE_MAP[opts.size];
      const badge = document.createElement("button");
      badge.type = "button";
      badge.className = "avatar-overflow";
      badge.textContent = `+${count}`;
      badge.title = `${count} more`;

      badge.style.cssText = `
        display:flex;align-items:center;justify-content:center;
        width:${sz.size}px;height:${sz.size}px;border-radius:${opts.shape === "circle" ? "50%" : `${sz.size / 5}px`};
        background:#f3f4f6;color:#6b7280;font-size:${sz.fontSize}px;font-weight:600;
        border:${opts.ring ? `2px solid ${opts.ringColor}` : "none"};
        cursor:pointer;transition:all 0.15s ease;flex-shrink:0;
        font-family:-apple-system,sans-serif;
      `;

      badge.addEventListener("click", () => opts.onOverflowClick?.());
      badge.addEventListener("mouseenter", () => {
        badge.style.background = "#e5e7eb";
        badge.style.color = "#374151";
      });
      badge.addEventListener("mouseleave", () => {
        badge.style.background = "#f3f4f6";
        badge.style.color = "#6b7280";
      });

      return badge;
    }

    // Initial render
    render();

    const instance: AvatarGroupInstance = {
      element: container,

      getItems() { return [...items]; },

      setItems(newItems: AvatarItem[]) {
        items = [...newItems];
        render();
      },

      addItem(item: AvatarItem) {
        items.push(item);
        render();
      },

      removeItem(index: number) {
        if (index >= 0 && index < items.length) {
          items.splice(index, 1);
          render();
        }
      },

      updateItem(index: number, updates: Partial<AvatarItem>) {
        if (index >= 0 && index < items.length) {
          items[index] = { ...items[index]!, ...updates };
          render();
        }
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create an avatar group */
export function createAvatarGroup(options: AvatarGroupOptions): AvatarGroupInstance {
  return new AvatarGroupManager().create(options);
}
