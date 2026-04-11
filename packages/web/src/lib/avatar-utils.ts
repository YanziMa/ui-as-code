/**
 * Avatar Utilities: User avatar component with image fallback, initials
 * generation, size variants, status indicators, group avatars, and
 * color generation from name.
 */

// --- Types ---

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarShape = "circle" | "square" | "rounded";

export interface AvatarOptions {
  /** Image source URL */
  src?: string;
  /** User's full name (for initials fallback) */
  name?: string;
  /** Custom alt text */
  alt?: string;
  /** Size variant */
  size?: AvatarSize;
  /** Shape variant */
  shape?: AvatarShape;
  /** Custom background color (for initials) */
  backgroundColor?: string;
  /** Text color for initials */
  textColor?: string;
  /** Font size override */
  fontSize?: string;
  /** Show status indicator */
  status?: "online" | "offline" | "away" | "busy" | null;
  /** Status position ("bottom-right" or "bottom-left") */
  statusPosition?: "bottom-right" | "bottom-left";
  /** Click handler */
  onClick?: () => void;
  /** Custom class name */
  className?: string;
}

export interface AvatarGroupOptions {
  /** Individual avatar options */
  avatars: AvatarOptions[];
  /** Max visible before "+N" overflow */
  maxVisible?: number;
  /** Size of each avatar */
  size?: AvatarSize;
  /** Shape of each avatar */
  shape?: AvatarShape;
  /** Overlap between avatars (px, negative = overlap) */
  overlap?: number;
  /** Container element */
  container?: HTMLElement;
  /** Called when an avatar is clicked */
  onAvatarClick?: (index: number, options: AvatarOptions) => void;
}

// --- Size Map ---

const SIZE_MAP: Record<AvatarSize, { dimension: string; fontSize: string; statusSize: string }> = {
  "xs": { dimension: "24px", fontSize: "10px", statusSize: "6px" },
  "sm": { dimension: "32px", fontSize: "11px", statusSize: "8px" },
  "md": { dimension: "40px", fontSize: "13px", statusSize: "10px" },
  "lg": { dimension: "48px", fontSize: "15px", statusSize: "12px" },
  "xl": { dimension: "64px", fontSize: "20px", statusSize: "14px" },
};

// --- Color Palette for Initials ---

const AVATAR_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e",
];

/** Generate a consistent color from a string (name/email) */
export function generateAvatarColor(input: string): string {
  if (!input) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** Extract initials from a name (max 2 characters) */
export function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

// --- Core Factory ---

/**
 * Create an avatar element.
 *
 * @example
 * ```ts
 * const avatarEl = createAvatar({
 *   src: "/avatar.jpg",
 *   name: "Alice Johnson",
 *   size: "md",
 *   status: "online",
 * });
 * document.body.appendChild(avatarEl);
 * ```
 */
export function createAvatar(options: AvatarOptions = {}): HTMLElement {
  const {
    src,
    name,
    alt,
    size = "md",
    shape = "circle",
    backgroundColor,
    textColor,
    fontSize,
    status,
    statusPosition = "bottom-right",
    onClick,
    className,
  } = options;

  const config = SIZE_MAP[size];
  const bgColor = backgroundColor ?? generateAvatarColor(name ?? "");
  const txtColor = textColor ?? "#fff";

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `avatar ${shape} ${size} ${className ?? ""}`.trim();
  wrapper.style.cssText =
    `position:relative;display:inline-flex;align-items:center;justify-content:center;` +
    `width:${config.dimension};height:${config.dimension};` +
    `${shape === "circle" ? "border-radius:50%;" : shape === "rounded" ? "border-radius:12px;" : "border-radius:4px;"}` +
    `background:${bgColor};color:${txtColor};` +
    `font-size:${fontSize ?? config.fontSize};font-weight:600;` +
    "overflow:hidden;user-select:none;flex-shrink:0;" +
    (onClick ? "cursor:pointer;" : "");

  if (src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = alt || name || "Avatar";
    img.style.cssText =
      "width:100%;height:100%;object-fit-cover;display:none;";
    img.addEventListener("load", () => { img.style.display = ""; });
    img.addEventListener("error", () => {
      // Fallback to initials on image error
      img.style.display = "none";
      _showInitials(wrapper, name);
    });
    wrapper.appendChild(img);

    // Initials as placeholder while loading
    _showInitials(wrapper, name);

    // Hide initials when image loads
    img.addEventListener("load", () => {
      const initialsEl = wrapper.querySelector(".avatar-initials");
      if (initialsEl) initialsEl.style.display = "none";
    });
  } else {
    _showInitials(wrapper, name);
  }

  // Status indicator
  if (status) {
    const statusEl = document.createElement("span");
    statusEl.className = `avatar-status ${status}`;
    const statusColors: Record<string, string> = {
      "online": "#22c55e",
      "offline": "#9ca3af",
      "away": "#f59e0b",
      "busy": "#ef4444",
    };

    statusEl.style.cssText =
      `position:absolute;width:${config.statusSize};height:${config.statusSize};` +
      `border-radius:50%;border:2px solid #fff;background:${statusColors[status] ?? "#9ca3af"};` +
      `${statusPosition === "bottom-right" ? "right:-2px;bottom:-2px;" : "left:-2px;bottom:-2px;"}`;
    wrapper.appendChild(statusEl);
  }

  // Click handler
  if (onClick) {
    wrapper.addEventListener("click", onClick);
    wrapper.setAttribute("tabIndex", "0");
    wrapper.setAttribute("role", "button");
    wrapper.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }
    });
  }

  return wrapper;
}

function _showInitials(wrapper: HTMLElement, name?: string): void {
  let initialsEl = wrapper.querySelector(".avatar-initials") as HTMLElement | null;
  if (!initialsEl) {
    initialsEl = document.createElement("span");
    initialsEl.className = "avatar-initials";
    initialsEl.style.cssText =
      "position:absolute;inset:0;display:flex;align-items:center;" +
      "justify-content:center;line-height:1;";
    wrapper.appendChild(initialsEl);
  }
  initialsEl.textContent = getInitials(name ?? "");
  initialsEl.style.display = "";
}

// --- Avatar Group ---

/**
 * Create a stacked avatar group.
 *
 * @example
 * ```ts
 * const group = createAvatarGroup({
 *   avatars: [
 *     { name: "Alice", src: "/alice.jpg" },
 *     { name: "Bob", src: "/bob.jpg" },
 *     { name: "Charlie" },
 *     { name: "Diana" },
 *     { name: "Eve" },
 *   ],
 *   maxVisible: 3,
 * });
 * ```
 */
export function createAvatarGroup(options: AvatarGroupOptions): HTMLElement {
  const {
    avatars,
    maxVisible = avatars.length,
    size = "md",
    shape = "circle",
    overlap = -12,
    container,
    onAvatarClick,
  } = options;

  const group = document.createElement("div");
  group.className = "avatar-group";
  group.style.cssText = "display:flex;align-items:center;";

  const visibleCount = Math.min(maxVisible, avatars.length);
  const overflowCount = avatars.length - visibleCount;

  avatars.slice(0, visibleCount).forEach((opts, i) => {
    const avatar = createAvatar({ ...opts, size, shape });
    avatar.style.marginLeft = i > 0 ? `${overlap}px` : "0";
    avatar.style.zIndex = String(visibleCount - i);

    if (onAvatarClick) {
      avatar.addEventListener("click", () => onAvatarClick(i, opts));
    }

    group.appendChild(avatar);
  });

  // Overflow indicator
  if (overflowCount > 0) {
    const overflow = document.createElement("div");
    const config = SIZE_MAP[size];
    overflow.className = "avatar-overflow";
    overflow.textContent = `+${overflowCount}`;
    overflow.style.cssText =
      `display:inline-flex;align-items:center;justify-content:center;` +
      `width:${config.dimension};height:${config.dimension};` +
      `${shape === "circle" ? "border-radius:50%;" : shape === "rounded" ? "border-radius:12px;" : "border-radius:4px;"}` +
      "background:#f3f4f6;color:#6b7280;font-size:" +
      (size === "xs" ? "9px" : size === "sm" ? "10px" : size === "md" ? "11px" : size === "lg" ? "13px" : "15px") +
      ";font-weight:600;margin-left:" + `${overlap}px` + ";" +
      "z-index:0;border:2px solid #fff;box-sizing:border-box;" +
      "cursor:pointer;user-select:none;flex-shrink:0;";

    group.appendChild(overflow);
  }

  if (container) container.appendChild(group);

  return group;
}
