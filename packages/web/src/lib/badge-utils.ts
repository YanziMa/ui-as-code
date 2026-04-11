/**
 * Badge Utilities: Status badges, notification dots, count indicators,
 * pill tags, and label components with multiple variants.
 */

// --- Types ---

export type BadgeVariant = "default" | "primary" | "success" | "warning" | "error" | "info";
export type BadgeSize = "sm" | "md" | "lg";
export type DotPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

export interface BadgeOptions {
  /** Badge content (text, number, or empty for dot) */
  content?: string | number;
  /** Visual variant */
  variant?: BadgeVariant;
  /** Size */
  size?: BadgeSize;
  /** Shape: "pill" (rounded) or "rect" (square corners) */
  shape?: "pill" | "rect";
  /** Maximum value to display (e.g., 99 shows "99+") */
  max?: number;
  /** Show as dot only (no text) */
  dot?: boolean;
  /** Whether badge is hidden when zero/empty */
  hideWhenZero?: boolean;
  /** Custom class name */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

export interface DotBadgeOptions {
  /** Target element to attach the dot to */
  target: HTMLElement;
  /** Dot position */
  position?: DotPosition;
  /** Dot color (CSS value or variant name) */
  color?: string | BadgeVariant;
  /** Dot size (px) */
  size?: number;
  /** Pulse animation */
  pulse?: boolean;
  /** Whether the dot is visible */
  visible?: boolean;
}

export interface TagOptions {
  /** Tag text */
  text: string;
  /** Variant */
  variant?: BadgeVariant;
  /** Size */
  size?: BadgeSize;
  /** Removable? */
  removable?: boolean;
  /** Icon prefix (HTML string) */
  icon?: string;
  /** Click handler */
  onClick?: () => void;
  /** Remove handler */
  onRemove?: () => void;
  /** Custom class name */
  className?: string;
}

// --- Variant Colors ---

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; color: string; dotBg: string }> = {
  "default": { bg: "#f3f4f6", color: "#374151", dotBg: "#9ca3af" },
  "primary": { bg: "#eff6ff", color: "#2563eb", dotBg: "#3b82f6" },
  "success": { bg: "#ecfdf5", color: "#059669", dotBg: "#22c55e" },
  "warning": { bg: "#fffbeb", color: "#d97706", dotBg: "#f59e0b" },
  "error": { bg: "#fef2f2", color: "#dc2626", dotBg: "#ef4444" },
  "info": { bg: "#eff6ff", color: "#0284c7", dotBg: "#0ea5e9" },
};

const SIZE_CONFIG: Record<BadgeSize, { fontSize: string; padding: string; minWidth: string }> = {
  "sm": { fontSize: "10px", padding: "1px 5px", minWidth: "14px" },
  "md": { fontSize: "11px", padding: "2px 7px", minWidth: "18px" },
  "lg": { fontSize: "12px", padding: "3px 9px", minWidth: "22px" },
};

// --- Core Factory ---

/**
 * Create a badge element.
 *
 * @example
 * ```ts
 * const badge = createBadge({ content: 42, variant: "error", size: "sm" });
 * container.appendChild(badge);
 * ```
 */
export function createBadge(options: BadgeOptions = {}): HTMLElement {
  const {
    content,
    variant = "default",
    size = "md",
    shape = "pill",
    max = 99,
    dot = false,
    hideWhenZero = true,
    className,
    onClick,
  } = options;

  const vs = VARIANT_STYLES[variant];
  const sc = SIZE_CONFIG[size];

  // Determine display value
  let displayValue: string;
  if (dot || content === undefined || content === null) {
    displayValue = "";
  } else if (typeof content === "number") {
    if (content === 0 && hideWhenZero) {
      // Hidden — return invisible element
      const hidden = document.createElement("span");
      hidden.style.display = "none";
      return hidden;
    }
    displayValue = content > max ? `${max}+` : String(content);
  } else {
    displayValue = content.trim() === "" && hideWhenZero ? "" : content;
  }

  if (!dot && displayValue === "" && hideWhenZero) {
    const hidden = document.createElement("span");
    hidden.style.display = "none";
    return hidden;
  }

  const el = document.createElement("span");
  el.className = `badge ${variant} ${size} ${shape} ${className ?? ""}`.trim();

  if (dot) {
    el.style.cssText =
      `display:inline-flex;width:${size === "sm" ? "8px" : size === "md" ? "10px" : "12px"};` +
      `height:${size === "sm" ? "8px" : size === "md" ? "10px" : "12px"};` +
      `border-radius:50%;background:${vs.dotBg};flex-shrink:0;`;
  } else {
    el.style.cssText =
      `display:inline-flex;align-items:center;justify-content:center;` +
      `font-size:${sc.fontSize};font-weight:600;line-height:1;color:${vs.color};` +
      `background:${vs.bg};padding:${sc.padding};min-width:${sc.minWidth};` +
      `border-radius:${shape === "pill" ? "9999px" : "4px"};` +
      "white-space:nowrap;text-align:center;" +
      (onClick ? "cursor:pointer;user-select:none;" : "");
    el.textContent = displayValue;
  }

  if (onClick) {
    el.addEventListener("click", onClick);
  }

  return el;
}

/** Create a dot badge attached to a target element */
export function createDotBadge(options: DotBadgeOptions): { el: HTMLElement; destroy: () => void } {
  const {
    target,
    position = "top-right",
    color = "error",
    size = 10,
    pulse = false,
    visible = true,
  } = options;

  const dotColor = typeof color === "string" ? color : VARIANT_STYLES[color].dotBg;

  const dot = document.createElement("span");
  dot.className = "dot-badge";
  dot.style.cssText =
    `position:absolute;width:${size}px;height:${size}px;border-radius:50%;` +
    `background:${dotColor};z-index:10;border:2px solid #fff;box-sizing:border-box;` +
    "transform:translate(0, 0);" +
    (visible ? "" : "display:none;") +
    (pulse
      ? `animation:pulse-dot 1.5s ease-in-out infinite;`
      : "");

  // Position
  switch (position) {
    case "top-right":
      Object.assign(dot.style, { top: "-4px", right: "-4px" });
      break;
    case "top-left":
      Object.assign(dot.style, { top: "-4px", left: "-4px" });
      break;
    case "bottom-right":
      Object.assign(dot.style, { bottom: "-4px", right: "-4px" });
      break;
    case "bottom-left":
      Object.assign(dot.style, { bottom: "-4px", left: "-4px" });
      break;
  }

  // Ensure target is positioned
  const targetStyle = getComputedStyle(target);
  if (targetStyle.position === "static") {
    target.style.position = "relative";
  }

  target.appendChild(dot);

  // Inject keyframe for pulse
  if (pulse && !document.getElementById("badge-pulse-style")) {
    const styleEl = document.createElement("style");
    styleEl.id = "badge-pulse-style";
    styleEl.textContent =
      "@keyframes pulse-dot{0%,100%{opacity:1;}50%{opacity:0.4;}}";
    document.head.appendChild(styleEl);
  }

  return {
    el: dot,
    destroy: () => { dot.remove(); },
  };
}

/** Create a tag/chip with optional remove button */
export function createTag(options: TagOptions): HTMLElement {
  const {
    text,
    variant = "default",
    size = "md",
    removable = false,
    icon,
    onClick,
    onRemove,
    className,
  } = options;

  const vs = VARIANT_STYLES[variant];
  const sc = SIZE_CONFIG[size];

  const tag = document.createElement("div");
  tag.className = `tag ${variant} ${className ?? ""}`.trim();
  tag.style.cssText =
    `display:inline-flex;align-items:center;gap:4px;padding:${sc.padding};` +
    `background:${vs.bg};color:${vs.color};border-radius:9999px;` +
    `font-size:${sc.fontSize};font-weight:500;line-height:1;` +
    "white-space:nowrap;max-width:200px;" +
    (onClick ? "cursor:pointer;user-select:none;" : "");

  // Icon
  if (icon) {
    const iconSpan = document.createElement("span");
    iconSpan.innerHTML = icon;
    iconSpan.style.display = "inline-flex";
    iconSpan.style.flexShrink = "0";
    tag.appendChild(iconSpan);
  }

  // Text
  const label = document.createElement("span");
  label.textContent = text;
  label.style.overflow = "hidden";
  label.style.textOverflow = "ellipsis";
  label.style.whiteSpace = "nowrap";
  tag.appendChild(label);

  // Remove button
  if (removable) {
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.innerHTML = "&times;";
    removeBtn.setAttribute("aria-label", `Remove ${text}`);
    removeBtn.style.cssText =
      "display:inline-flex;align-items:center;justify-content:center;" +
      "width:16px;height:16px;border:none;background:none;cursor:pointer;" +
      `color:${vs.color};font-size:14px;line-height:1;border-radius:50%;` +
      "flex-shrink:0;padding:0;margin-left:-2px;";
    removeBtn.addEventListener("mouseenter", () => { removeBtn.style.background = "rgba(0,0,0,0.08)"; });
    removeBtn.addEventListener("mouseleave", () => { removeBtn.style.background = ""; });
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onRemove?.();
      tag.remove();
    });
    tag.appendChild(removeBtn);
  }

  if (onClick) {
    tag.addEventListener("click", onClick);
  }

  return tag;
}
