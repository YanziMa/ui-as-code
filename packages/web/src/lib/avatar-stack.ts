/**
 * Avatar Stack: Stacked/cascading avatar group with overlap, max visible count,
 * size variants, status indicators (online/offline/away/busy), counter badge,
 * and click-to-expand functionality.
 */

// --- Types ---

export type AvatarStackSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarStatus = "online" | "offline" | "away" | "busy" | "dnd";

export interface AvatarStackItem {
  /** Image URL */
  src?: string;
  /** Fallback initials (derived from name if not provided) */
  initials?: string;
  /** Full name (used for initials fallback and title) */
  name: string;
  /** Status indicator */
  status?: AvatarStatus;
  /** Custom color override */
  color?: string;
  /** Link URL */
  href?: string;
  /** Click handler */
  onClick?: () => void;
}

export interface AvatarStackOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Avatar items */
  items: AvatarStackItem[];
  /** Maximum avatars to show before "+N" counter */
  maxVisible?: number;
  /** Size variant */
  size?: AvatarStackSize;
  /** Overlap amount (px, negative = gap) */
  overlap?: number;
  /** Shape: circle or rounded square */
  shape?: "circle" | "rounded" | "square";
  /** Show status indicator dots? */
  showStatus?: boolean;
  /** Show counter badge when truncated? */
  showCounter?: boolean;
  /** Counter position: "top-right" | "bottom-right" */
  counterPosition?: "top-right" | "bottom-right";
  /** Size of status dot relative to avatar (0-1 scale) */
  statusDotSize?: number;
  /** Border around stack? */
  bordered?: boolean;
  /** Border color */
  borderColor?: string;
  /** Background color for counter badge */
  counterBg?: string;
  /** Counter text color */
  counterColor?: string;
  /** On click callback for any avatar */
  onItemClick?: (item: AvatarStackItem, index: number) => void;
  /** On expand callback (when clicking +N) */
  onExpand?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface AvatarStackInstance {
  element: HTMLElement;
  getItems: () => AvatarStackItem[];
  setItems: (items: AvatarStackItem[]) => void;
  addItem: (item: AvatarStackItem) => void;
  removeItem: (name: string) => void;
  setVisibleCount: (count: number) => void;
  destroy: () => void;
}

// --- Size Config ---

const SIZE_MAP: Record<AvatarStackSize, { size: number; fontSize: number; dotSize: number }> = {
  xs:  { size: 24, fontSize: 9,  dotSize: 6 },
  sm:  { size: 32, fontSize: 11, dotSize: 7 },
  md:  { size: 40, fontSize: 13, dotSize: 8 },
  lg:  { size: 48, fontSize: 15, dotSize: 9 },
  xl:  { size: 56, fontSize: 17, dotSize: 10 },
};

const STATUS_COLORS: Record<AvatarStatus, string> = {
  online: "#22c55e",
  offline: "#9ca3af",
  away: "#f59e0b",
  busy: "#ef4444",
  dnd:   "#8b5cf6",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts.map((p) => p.charAt(0).toUpperCase()).join("");
  return name.charAt(0).toUpperCase();
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 55%)`;
}

// --- Main Class ---

export class AvatarStackManager {
  create(options: AvatarStackOptions): AvatarStackInstance {
    const opts = {
      maxVisible: options.maxVisible ?? 5,
      size: options.size ?? "md",
      overlap: options.overlap ?? 16,
      shape: options.shape ?? "circle",
      showStatus: options.showStatus ?? true,
      showCounter: options.showCounter ?? true,
      counterPosition: options.counterPosition ?? "top-right",
      statusDotSize: options.statusDotSize ?? 0.35,
      bordered: options.bordered ?? false,
      borderColor: options.borderColor ?? "#e5e7eb",
      counterBg: options.counterBg ?? "#4338ca",
      counterColor: options.counterColor ?? "#fff",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("AvatarStack: container not found");

    container.className = `avatar-stack ${opts.className ?? ""}`;
    let items = [...options.items];
    let destroyed = false;
    let expanded = false;
    const visibleCount = opts.maxVisible;

    function render(): void {
      container.innerHTML = "";

      const sz = SIZE_MAP[opts.size];
      const showItems = expanded ? items : items.slice(0, visibleCount);
      const overflowCount = items.length - showItems;

      // Wrapper
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        display:inline-flex;align-items:center;${opts.bordered ? `padding:4px;border:1px solid ${opts.borderColor};border-radius:${sz.size / 2 + 4}px;` : ""}
        position:relative;
      `;

      for (let i = 0; i < showItems.length; i++) {
        const item = items[i]!;
        const isLast = i === showItems.length - 1 && !expanded;
        const translateX = i * opts.overlap;

        const avatarWrapper = document.createElement("div");
        avatarWrapper.style.cssText = `
          position:relative;z-index:${showItems - i};
          transform:translateX(${-translateX}px);
          transition:transform 0.2s ease;
        `;

        // Status dot
        if (opts.showStatus && item.status) {
          const dot = document.createElement("span");
          const dotSz = sz.size * opts.statusDotSize;
          dot.style.cssText = `
            position:absolute;${opts.counterPosition === "top-right" ? "top:-2px;right:-2px" : "bottom:-2px;right:-2px"};
            width:${dotSz}px;height:${dotSz}px;border-radius:50%;
            background:${STATUS_COLORS[item.status]};
            border:1.5px solid #fff;flex-shrink:0;z-index:2;
          `;
          avatarWrapper.appendChild(dot);
        }

        // Avatar element
        const avatar = document.createElement("a");
        avatar.href = item.href ?? "#";
        avatar.className = "stack-avatar";
        avatar.title = item.name;
        avatar.style.cssText = `
          display:flex;align-items:center;justify-content:center;
          width:${sz.size}px;height:${sz.size}px;border-radius:${opts.shape === "circle" ? "50%" : opts.shape === "rounded" ? "12px" : "4px"};
          background:${item.color ?? stringToColor(item.name)};
          color:#fff;font-size:${sz.fontSize}px;font-weight:600;
          text-decoration:none;overflow:hidden;flex-shrink:0;
          user-select:none;border:2px solid rgba(255,255,255,0.15);
          transition:transform 0.2s ease,z-index 1;
          box-shadow:0 2px 4px rgba(0,0,0,0.08);
        `;

        if (item.src) {
          const img = document.createElement("img");
          img.src = item.src;
          img.alt = item.name;
          img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:inherit;";
          avatar.appendChild(img);
        } else {
          avatar.textContent = item.initials ?? getInitials(item.name);
        }

        avatar.addEventListener("click", (e) => {
          e.preventDefault();
          opts.onItemClick?.(item, i);
          if (item.href && item.href !== "#") window.open(item.href, "_blank");
        });

        avatar.addEventListener("mouseenter", () => {
          avatar.style.transform = "scale(1.08)";
          avatar.style.zIndex = "10";
        });
        avatar.addEventListener("mouseleave", () => {
          avatar.style.transform = "";
          avatar.style.zIndex = "1";
        });

        avatarWrapper.appendChild(avatar);
        wrapper.appendChild(avatarWrapper);
      }

      // Counter badge
      if (opts.showCounter && overflowCount > 0 && !expanded) {
        const badge = document.createElement("span");
        badge.className = "stack-counter";
        badge.style.cssText = `
          position:absolute;${opts.counterPosition === "top-right" ? "top:-6px;right:-6px" : "bottom:-6px;right:-6px"};
          min-width:18px;height:18px;border-radius:9px;
          background:${opts.counterBg};color:${opts.counterColor};
          font-size:10px;font-weight:600;display:flex;align-items:center;
          justify-content:center;padding:0 5px;border:1.5px solid rgba(255,255,255,0.3);
          z-index:10;cursor:pointer;
        `;
        badge.textContent = `+${overflowCount}`;
        badge.title = `${overflowCount} more`;
        badge.addEventListener("click", (e) => {
          e.stopPropagation();
          expanded = true;
          render();
          opts.onExpand?.();
        });
        wrapper.appendChild(badge);
      }

      container.appendChild(wrapper);
    }

    const instance: AvatarStackInstance = {
      element: container,

      getItems() { return [...items]; },

      setItems(newItems: AvatarStackItem[]) {
        items = newItems;
        render();
      },

      addItem(newItem: AvatarStackItem) {
        items.push(newItem);
        render();
      },

      removeItem(name: string) {
        items = items.filter((i) => i.name !== name);
        render();
      },

      setVisibleCount(count: number) {
        visibleCount = count;
        render();
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create an avatar stack */
export function createAvatarStack(options: AvatarStackOptions): AvatarStackInstance {
  return new AvatarStackManager().create(options);
}
