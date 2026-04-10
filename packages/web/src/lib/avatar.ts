/**
 * Avatar Component: Image/initials avatar with fallback, status indicator,
 * group display (stacked), size variants, click handler, and accessibility.
 */

// --- Types ---

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarShape = "circle" | "square" | "rounded";

export interface AvatarOptions {
  /** Image URL */
  src?: string;
  /** Fallback text (used for initials) */
  name?: string;
  /** Alt text for image */
  alt?: string;
  /** Size variant */
  size?: AvatarSize;
  /** Shape variant */
  shape?: AvatarShape;
  /** Background color when showing initials */
  color?: string;
  /** Text color for initials */
  textColor?: string;
  /** Font size override */
  fontSize?: string;
  /** Border width/color */
  border?: { width: number; color: string };
  /** Status indicator */
  status?: "online" | "offline" | "away" | "busy" | "none";
  /** Status position: 'bottom-right' or 'bottom-left' */
  statusPosition?: "bottom-right" | "bottom-left";
  /** Click handler */
  onClick?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface AvatarGroupOptions {
  /** Avatars to display */
  avatars: AvatarOptions[];
  /** Max visible before "+N" overflow */
  maxVisible?: number;
  /** Size of each avatar */
  size?: AvatarSize;
  /** Shape of each avatar */
  shape?: AvatarShape;
  /** Overlap between avatars in px (default: -8) */
  overlap?: number;
  /** Overflow label style */
  overflowStyle?: "count" | "initials";
  /** Click handler on individual avatar */
  onAvatarClick?: (index: number, options: AvatarOptions) => void;
  /** Container CSS class */
  className?: string;
}

// --- Constants ---

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

const FONT_SIZE_MAP: Record<AvatarSize, string> = {
  xs: "10px",
  sm: "12px",
  md: "14px",
  lg: "16px",
  xl: "20px",
};

const STATUS_COLORS: Record<string, string> = {
  online: "#22c55e",
  offline: "#9ca3af",
  away: "#f59e0b",
  busy: "#ef4444",
};

// --- Color Palette ---

/** Generate a consistent color from a string (for initial backgrounds) */
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit int
  }

  const hues = [
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e", "#ef4444", "#f97316", "#eab308", "#84cc16",
    "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
    "#3b82f6", "#6366f1",
  ];
  return hues[Math.abs(hash) % hues.length]!;
}

// --- Initials Extraction ---

/**
 * Extract initials from a name string.
 * e.g., "John Doe" -> "JD", "Alice" -> "A"
 */
export function getInitials(name: string, maxLetters = 2): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return parts.slice(0, maxLetters).map((p) => p.charAt(0).toUpperCase()).join("");
}

// --- Single Avatar ---

/**
 * Create an avatar DOM element.
 */
export function createAvatar(options: AvatarOptions = {}): HTMLElement {
  const opts = {
    size: options.size ?? "md",
    shape: options.shape ?? "circle",
    status: options.status ?? "none",
    statusPosition: options.statusPosition ?? "bottom-right",
    alt: options.alt ?? "",
    ...options,
  };

  const px = SIZE_MAP[opts.size];
  const fontSize = opts.fontSize ?? FONT_SIZE_MAP[opts.size];

  // Container
  const el = document.createElement("div");
  el.className = `avatar avatar-${opts.size} avatar-${opts.shape} ${opts.className ?? ""}`;
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", opts.name ?? opts.alt ?? "Avatar");
  el.style.cssText = `
    display:inline-flex;align-items:center;justify-content:center;
    width:${px}px;height:${px}px;border-radius:${opts.shape === "circle" ? "50%" : opts.shape === "rounded" ? "12px" : "4px"};
    font-size:${fontSize};font-weight:600;color:#fff;overflow:hidden;
    flex-shrink:0;position:relative;user-select:none;
    ${opts.onClick ? "cursor:pointer;" : ""}
  `;

  // Border
  if (opts.border) {
    el.style.border = `${opts.border.width}px solid ${opts.border.color}`;
  }

  // Background color
  const bgColor = opts.color ?? (opts.name ? stringToColor(opts.name) : "#94a3b8");
  el.style.background = bgColor;

  // Content: image or initials
  if (opts.src) {
    const img = document.createElement("img");
    img.src = opts.src;
    img.alt = opts.alt;
    img.style.cssText = `
      width:100%;height:100%;object-fit:cover;display:none;
    `;
    img.onload = () => { img.style.display = "block"; };
    img.onerror = () => { img.style.display = "none"; renderInitials(); };

    el.appendChild(img);
  } else {
    renderInitials();
  }

  function renderInitials(): void {
    const text = document.createElement("span");
    text.className = "avatar-initials";
    text.textContent = getInitials(opts.name ?? "", 2);
    text.style.cssText = `color:${opts.textColor ?? "#fff"};`;
    el.appendChild(text);
  }

  // Status indicator
  if (opts.status !== "none") {
    const statusSize = Math.max(8, Math.round(px * 0.28));
    const statusEl = document.createElement("span");
    statusEl.className = `avatar-status avatar-status-${opts.status}`;
    statusEl.setAttribute("aria-hidden", "true");

    const isRight = opts.statusPosition === "bottom-right";
    statusEl.style.cssText = `
      position:absolute;${isRight ? "right:-1px" : "left:-1px"};
      bottom:-1px;width:${statusSize}px;height:${statusSize}px;
      border-radius:50%;border:2px solid #fff;
      background:${STATUS_COLORS[opts.status] ?? STATUS_COLORS.offline};
      box-sizing:border-box;
    `;
    el.appendChild(statusEl);
  }

  // Click handler
  if (opts.onClick) {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      opts.onClick!();
    });
    el.setAttribute("tabindex", "0");
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); opts.onClick!(); }
    });
  }

  return el;
}

// --- Avatar Group ---

/**
 * Create a stacked avatar group.
 */
export function createAvatarGroup(options: AvatarGroupOptions): HTMLElement {
  const opts = {
    maxVisible: options.maxVisible ?? 5,
    size: options.size ?? "md",
    shape: options.shape ?? "circle",
    overlap: options.overlap ?? -8,
    overflowStyle: options.overflowStyle ?? "count",
    ...options,
  };

  const container = document.createElement("div");
  container.className = `avatar-group ${options.className ?? ""}`;
  container.style.cssText = "display:flex;align-items:center;flex-direction:row-reverse;";

  const avatars = opts.avatars.slice(0).reverse(); // Reverse so first item appears leftmost

  let shown = 0;
  for (let i = 0; i < avatars.length; i++) {
    if (shown >= opts.maxVisible) break;

    const idx = avatars.length - 1 - i; // Original index
    const avatarOpts = avatars[i]!;
    const avatar = createAvatar({
      ...avatarOpts,
      size: opts.size,
      shape: opts.shape,
      onClick: opts.onAvatarClick ? () => opts.onAvatarClick!(idx, avatarOpts) : undefined,
    });

    avatar.style.marginLeft = shown > 0 ? `${opts.overlap}px` : "0";
    avatar.style.zIndex = String(opts.maxVisible - shown);
    avatar.style.transition = "transform 0.15s ease, box-shadow 0.15s ease";

    // Hover effect
    avatar.addEventListener("mouseenter", () => {
      avatar.style.transform = "translateY(-2px)";
      avatar.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    });
    avatar.addEventListener("mouseleave", () => {
      avatar.style.transform = "";
      avatar.style.boxShadow = "";
    });

    container.appendChild(avatar);
    shown++;
  }

  // Overflow indicator
  const remaining = avatars.length - opts.maxVisible;
  if (remaining > 0) {
    const overflow = document.createElement("div");
    const px = SIZE_MAP[opts.size];
    overflow.className = "avatar-overflow";
    overflow.style.cssText = `
      display:inline-flex;align-items:center;justify-content:center;
      width:${px}px;height:${px}px;border-radius:${opts.shape === "circle" ? "50%" : opts.shape === "rounded" ? "12px" : "4px"};
      background:#e2e8f0;color:#64748b;font-size:${FONT_SIZE_MAP[opts.size]};
      font-weight:600;margin-left:${opts.overlap}px;z-index:0;
    `;

    if (opts.overflowStyle === "initials") {
      const restAvatars = avatars.slice(0, remaining).reverse();
      overflow.textContent = getInitials(
        restAvatars.map((a) => a.name ?? "").join(" "),
        2,
      );
    } else {
      overflow.textContent = `+${remaining}`;
    }

    container.appendChild(overflow);
  }

  return container;
}
