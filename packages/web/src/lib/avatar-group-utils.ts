/**
 * Avatar Group Utilities: Stacked avatar groups with overflow indicator,
 * size variants, shape options, presence indicators, tooltips, and
 * interactive selection support.
 */

// --- Types ---

export type AvatarGroupSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarGroupShape = "circle" | "square" | "rounded";

export interface AvatarGroupItem {
  /** Source URL for the image */
  src?: string;
  /** Fallback initials (2 chars max) */
  name?: string;
  /** Background color (auto-generated if omitted) */
  color?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Presence status */
  status?: "online" | "offline" | "away" | "busy" | "dnd";
  /** Click handler */
  onClick?: () => void;
}

export interface AvatarGroupOptions {
  /** Avatar items to display */
  items: AvatarGroupItem[];
  /** Maximum avatars to show before overflow */
  max?: number;
  /** Size variant */
  size?: AvatarGroupSize;
  /** Shape variant */
  shape?: AvatarGroupShape;
  /** Overlap between avatars (px, negative = overlap) */
  overlap?: number;
  /** Show presence indicator dots? */
  showStatus?: boolean;
  /** Show tooltips on hover? */
  showTooltip?: boolean;
  /** Overflow count display style ("badge" | "text") */
  overflowStyle?: "badge" | "text";
  /** Reverse order (last items first)? */
  reverse?: boolean;
  /** Border around each avatar */
  border?: boolean;
  /** Border color */
  borderColor?: string;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when an avatar is clicked */
  onItemClick?: (item: AvatarGroupItem, index: number) => void;
  /** Called when overflow is clicked */
  onOverflowClick?: (hiddenCount: number) => void;
}

export interface AvatarGroupInstance {
  /** Root wrapper element */
  el: HTMLElement;
  /** Update items */
  setItems(items: AvatarGroupItem[]): void;
  /** Get current items */
  getItems(): AvatarGroupItem[];
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Size Config ---

const SIZE_MAP: Record<AvatarGroupSize, { size: number; fontSize: string; statusSize: number }> = {
  "xs": { size: 20, fontSize: "9px", statusSize: 5 },
  "sm": { size: 24, fontSize: "10px", statusSize: 6 },
  "md": { size: 32, fontSize: "12px", statusSize: 7 },
  "lg": { size: 40, fontSize: "14px", statusSize: 8 },
  "xl": { size: 48, fontSize: "16px", statusSize: 9 },
};

// --- Status Colors ---

const STATUS_COLORS: Record<string, string> = {
  "online": "#22c55e",
  "offline": "#d1d5db",
  "away": "#f59e0b",
  "busy": "#f97316",
  "dnd": "#ef4444",
};

// --- Color Generation ---

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const PALETTE = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

function getColorForName(name: string): string {
  return PALETTE[hashString(name) % PALETTE.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0] + parts[1]![0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// --- Core Factory ---

/**
 * Create a stacked avatar group.
 *
 * @example
 * ```ts
 * const group = createAvatarGroup({
 *   items: [
 *     { name: "Alice Johnson", src: "/avatar1.png", status: "online" },
 *     { name: "Bob Smith", status: "away" },
 *     { name: "Carol Davis" },
 *   ],
 *   max: 4,
 *   showStatus: true,
 * });
 * ```
 */
export function createAvatarGroup(options: AvatarGroupOptions): AvatarGroupInstance {
  const {
    items,
    max = 5,
    size = "md",
    shape = "circle",
    overlap = -8,
    showStatus = false,
    showTooltip = false,
    overflowStyle = "badge",
    reverse = false,
    border = true,
    borderColor = "#fff",
    className,
    container,
    onItemClick,
    onOverflowClick,
  } = options;

  let _items = [...items];

  const sc = SIZE_MAP[size];
  const borderRadius = shape === "circle" ? "50%" : shape === "rounded" ? "8px" : "2px";

  // Root
  const root = document.createElement("div");
  root.className = `avatar-group ${size} ${shape} ${className ?? ""}`.trim();
  root.style.cssText =
    `display:inline-flex;align-items:center;` +
    `margin-left:${overlap > 0 ? 0 : Math.abs(overlap)}px;`;

  // Tooltip element (shared)
  let tooltipEl: HTMLElement | null = null;

  _render();

  // --- Render ---

  function _render(): void {
    root.innerHTML = "";

    const displayItems = reverse ? [..._items].reverse() : [..._items];
    const visibleCount = Math.min(displayItems.length, max);
    const hiddenCount = displayItems.length - visibleCount;

    for (let i = 0; i < visibleCount; i++) {
      const item = displayItems[i]!;
      const avatarEl = createAvatar(item, i);
      root.appendChild(avatarEl);
    }

    // Overflow indicator
    if (hiddenCount > 0) {
      const overflowEl = createOverflow(hiddenCount);
      root.appendChild(overflowEl);
    }
  }

  function createAvatar(item: AvatarGroupItem, index: number): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "avatar-group-item";
    wrapper.style.cssText =
      `position:relative;width:${sc.size}px;height:${sc.size}px;` +
      `border-radius:${borderRadius};flex-shrink:0;margin-left:${index > 0 && overlap < 0 ? `${overlap}px` : "0"};` +
      "cursor:pointer;overflow:hidden;" +
      (border ? `border:2px solid ${borderColor};box-sizing:border-box;` : "");

    // Avatar content
    let inner: HTMLElement;

    if (item.src) {
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.name ?? "";
      img.style.cssText =
        `width:100%;height:100%;object-fit:cover;border-radius:${borderRadius};`;
      img.onerror = () => {
        img.replaceWith(createFallback(item));
      };
      inner = img;
    } else {
      inner = createFallback(item);
    }

    wrapper.appendChild(inner);

    // Status dot
    if (showStatus && item.status) {
      const dot = document.createElement("span");
      dot.className = "avatar-status-dot";
      const ss = sc.statusSize;
      dot.style.cssText =
        `position:absolute;bottom:-1px;right:-1px;width:${ss}px;height:${ss}px;` +
        `border-radius:50%;background:${STATUS_COLORS[item.status] ?? STATUS_COLORS.offline};` +
        `border:2px solid ${borderColor};`;
      wrapper.appendChild(dot);
    }

    // Tooltip
    if (showTooltip && (item.tooltip || item.name)) {
      wrapper.addEventListener("mouseenter", (e) => showTooltipAt(e, item.tooltip || item.name!));
      wrapper.addEventListener("mouseleave", hideTooltip);
    }

    // Click handler
    wrapper.addEventListener("click", (e) => {
      e.stopPropagation();
      item.onClick?.();
      onItemClick?.(item, index);
    });

    return wrapper;
  }

  function createFallback(item: AvatarGroupItem): HTMLElement {
    const fallback = document.createElement("div";
    fallback.style.cssText =
      `width:100%;height:100%;display:flex;align-items:center;justify-content:center;` +
      `background:${item.color ?? getColorForName(item.name ?? "")};` +
      `color:#fff;font-size:${sc.fontSize};font-weight:600;border-radius:${borderRadius};` +
      "user-select:none;";
    fallback.textContent = item.name ? getInitials(item.name) : "?";
    return fallback;
  }

  function createOverflow(count: number): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "avatar-overflow";
    wrapper.style.cssText =
      `position:relative;width:${sc.size}px;height:${sc.size}px;` +
      `border-radius:${borderRadius};flex-shrink:0;margin-left:${overlap < 0 ? `${overlap}px` : "0"};` +
      "cursor:pointer;display:flex;align-items:center;justify-content:center;" +
      (border ? `border:2px solid ${borderColor};box-sizing:border-box;` : "");

    if (overflowStyle === "badge") {
      wrapper.style.background = "#f3f4f6";
      wrapper.style.color = "#6b7280";
      wrapper.style.fontWeight = "600";
      wrapper.style.fontSize = sc.fontSize;
      wrapper.textContent = `+${count}`;
    } else {
      wrapper.style.background = "#dbeafe";
      wrapper.style.color = "#2563eb";
      wrapper.style.fontWeight = "600";
      wrapper.style.fontSize = sc.fontSize;
      wrapper.textContent = `+${count}`;
    }

    wrapper.addEventListener("click", (e) => {
      e.stopPropagation();
      onOverflowClick?.(count);
    });

    if (showTooltip) {
      wrapper.addEventListener("mouseenter", (e) => showTooltipAt(e, `${count} more`));
      wrapper.addEventListener("mouseleave", hideTooltip);
    }

    return wrapper;
  }

  function showTooltipAt(e: MouseEvent, text: string): void {
    hideTooltip();
    tooltipEl = document.createElement("div");
    tooltipEl.className = "avatar-tooltip";
    tooltipEl.textContent = text;
    tooltipEl.style.cssText =
      "position:fixed;z-index:9999;padding:4px 10px;border-radius:6px;" +
      "background:#111827;color:#fff;font-size:12px;font-weight:500;" +
      "pointer-events:none;white-space:nowrap;transform:translateX(-50%);" +
      "box-shadow:0 4px 12px rgba(0,0,0,0.15);";

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
    tooltipEl.style.top = `${rect.bottom + window.scrollY + 6}px`;

    document.body.appendChild(tooltipEl);
  }

  function hideTooltip(): void {
    if (tooltipEl) {
      tooltipEl.remove();
      tooltipEl = null;
    }
  }

  // --- Instance ---

  const instance: AvatarGroupInstance = {
    el: root,

    setItems(newItems) {
      _items = newItems;
      _render();
    },

    getItems() { return [..._items]; },

    destroy() {
      hideTooltip();
      root.remove();
    },
  };

  if (container) container.appendChild(root);

  return instance;
}
