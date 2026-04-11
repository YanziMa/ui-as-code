/**
 * Label Utilities: Label text formatting, truncation, badge generation,
 * tag/chip rendering helpers, color mapping, and accessibility utilities
 * for UI labels.
 */

// --- Types ---

export type LabelPreset = "new" | "beta" | "hot" | "sale" | "sold-out" | "limited" | "featured" | "verified" | "pro" | "free";

export interface BadgeConfig {
  text: string;
  variant?: "default" | "primary" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md";
  dot?: boolean;
  pulse?: boolean;
}

export interface TagConfig {
  text: string;
  color?: string;
  bgColor?: string;
  removable?: boolean;
  onRemove?: () => void;
  icon?: string;
}

export interface TruncateOptions {
  maxLength: number;
  ellipsis?: string;
  breakOnWord?: boolean;
  fromEnd?: boolean;
}

// --- Preset Badges ---

const PRESET_STYLES: Record<LabelPreset, { bg: string; color: string; text: string }> = {
  new:       { bg: "#dbeafe", color: "#1e40af", text: "New" },
  beta:      { bg: "#fef3c7", color: "#92400e", text: "Beta" },
  hot:       { bg: "#fee2e2", color: "#991b1b", text: "Hot" },
  sale:      { bg: "#dcfce7", color: "#166534", text: "Sale" },
  "sold-out": { bg: "#f3f4f6", color: "#6b7280", text: "Sold Out" },
  limited:   { bg: "#fce7f3", color: "#9d174d", text: "Limited" },
  featured:  { bg: "#ede9fe", color: "#5b21b6", text: "Featured" },
  verified:  { bg: "#d1fae5", color: "#065f46", text: "Verified" },
  pro:       { bg: "#e0e7ff", color: "#3730a3", text: "PRO" },
  free:      { bg: "#f0fdf4", color: "#15803d", text: "Free" },
};

/** Get preset badge styling */
export function getPresetStyle(preset: LabelPreset): { bg: string; color: string; text: string } {
  return PRESET_STYLES[preset] ?? PRESET_DEFAULT;
}

const PRESET_DEFAULT = { bg: "#f3f4f6", color: "#374151", text: "Label" };

// --- Text Formatting ---

/** Truncate text with ellipsis */
export function truncateLabel(text: string, options: TruncateOptions): string {
  const { maxLength, ellipsis = "...", breakOnWord = false, fromEnd = false } = options;

  if (text.length <= maxLength) return text;

  if (fromEnd) {
    return ellipsis + text.slice(text.length - maxLength + ellipsis.length);
  }

  if (breakOnWord) {
    const truncated = text.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > maxLength * 0.6) {
      return truncated.slice(0, lastSpace) + ellipsis;
    }
    return truncated + ellipsis;
  }

  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/** Format a count for display in a badge (e.g., 99+, 1.2K, 3.4M) */
export function formatCount(count: number, maxDisplay = 99): string {
  if (count <= maxDisplay) return String(count);
  if (count < 1000) return `${maxDisplay}+`;
  if (count < 1_000_000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

/** Capitalize first letter of each word */
export function titleCase(text: string): string {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Convert to uppercase with consistent handling */
export function toLabelCase(text: string): string {
  return text
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// --- Color Utilities ---

/** Generate contrasting text color (black or white) for a background */
export function getContrastColor(bgColor: string): string {
  // Parse hex
  let hex = bgColor.replace("#", "");
  if (hex.length === 3) hex = hex[0]! + hex[0]! + hex[1]! + hex[1]! + hex[2]! + hex[2]!;
  if (hex.length !== 6) return "#000000";

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/** Lighten or darken a hex color by a percentage */
export function adjustColor(hex: string, amount: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  if (h.length !== 6) return hex;

  const r = Math.min(255, Math.max(0, parseInt(h.slice(0, 2), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(h.slice(2, 4), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(h.slice(4, 6), 16) + amount));

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Generate a semi-transparent version of a color */
export function transparentColor(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  if (h.length !== 6) return hex;

  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

// --- DOM Creation Helpers ---

/** Create a simple badge/span element */
export function createBadge(config: BadgeConfig): HTMLSpanElement {
  const el = document.createElement("span");
  el.className = `badge badge-${config.variant ?? "default"} badge-${config.size ?? "sm"}`;

  const variantColors: Record<string, { bg: string; color: string }> = {
    default:  { bg: "#f3f4f6", color: "#374151" },
    primary:  { bg: "#eff6ff", color: "#1d4ed8" },
    success:  { bg: "#ecfdf5", color: "#047857" },
    warning:  { bg: "#fffbeb", color: "#b45309" },
    error:    { bg: "#fef2f2", color: "#b91c1c" },
    info:     { bg: "#eff6ff", color: "#0369a1" },
  };

  const vc = variantColors[config.variant ?? "default"] ?? variantColors.default;
  const isSmall = config.size === "sm";

  Object.assign(el.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: isSmall ? "10px" : "12px",
    fontWeight: "600",
    padding: isSmall ? "1px 6px" : "2px 8px",
    borderRadius: isSmall ? "9999px" : "6px",
    background: vc.bg,
    color: vc.color,
    whiteSpace: "nowrap",
    lineHeight: 1.2,
  });

  if (config.dot) {
    const dot = document.createElement("span");
    dot.style.cssText = `width:6px;height:6px;border-radius:50%;background:${vc.color};margin-right:4px;`;
    if (config.pulse) {
      dot.style.animation = "pulse-dot 1.5s ease-in-out infinite";
    }
    el.appendChild(dot);
  }

  el.appendChild(document.createTextNode(config.text));
  return el;
}

/** Create a tag/chip element */
export function createTag(config: TagConfig): HTMLElement {
  const wrapper = document.createElement("span");
  wrapper.className = "tag";

  const color = config.color ?? "#374151";
  const bgColor = config.bgColor ?? "#f3f4f6";

  Object.assign(wrapper.style, {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "2px 8px",
    fontSize: "12px",
    fontWeight: "500",
    borderRadius: "9999px",
    background: bgColor,
    color,
    border: `1px solid ${transparentColor(color, 0.2)}`,
    lineHeight: 1.4,
  });

  if (config.icon) {
    const iconEl = document.createElement("span");
    iconEl.innerHTML = config.icon;
    iconEl.style.cssText = "display:inline-flex;align-items:center;font-size:11px;";
    wrapper.appendChild(iconEl);
  }

  const textEl = document.createElement("span");
  textEl.textContent = config.text;
  wrapper.appendChild(textEl);

  if (config.removable) {
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.innerHTML = "&times;";
    removeBtn.setAttribute("aria-label", `Remove ${config.text}`);
    removeBtn.style.cssText =
      "display:inline-flex;align-items:center;justify-content:center;" +
      "width:14px;height:14px;border:none;background:none;color:currentColor;" +
      "font-size:12px;cursor:pointer;border-radius:50%;opacity:0.6;margin-left:2px;padding:0;";
    removeBtn.addEventListener("mouseenter", () => { removeBtn.style.opacity = "1"; });
    removeBtn.addEventListener("mouseleave", () => { removeBtn.style.opacity = "0.6"; });
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      config.onRemove?.();
      wrapper.remove();
    });
    wrapper.appendChild(removeBtn);
  }

  return wrapper;
}

// --- Accessibility ---

/** Generate an accessible aria-label from label parts */
export function buildAriaLabel(parts: string[], separator = ", "): string {
  return parts.filter(Boolean).join(separator);
}

/** Check if contrast ratio between two colors meets WCAG AA (4.5:1) */
export function meetsWcagAA(fg: string, bg: string): boolean {
  return getContrastRatio(fg, bg) >= 4.5;
}

/** Check if contrast ratio meets WCAG AAA (7:1) */
export function meetsWcagAAA(fg: string, bg: string): boolean {
  return getContrastRatio(fg, bg) >= 7;
}

function getContrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(color: string): number {
  let hex = color.replace("#", "").replace(/^rgba?\((.*)\)/, "$1");
  if (hex.includes(",")) {
    // RGB format
    const parts = hex.split(",").map((s) => parseFloat(s.trim()) / 255);
    return 0.2126 * srgbToLinear(parts[0]) + 0.7152 * srgbToLinear(parts[1]) + 0.0722 * srgbToLinear(parts[2]);
  }
  if (hex.length === 3) hex = hex[0]! + hex[0]! + hex[1]! + hex[1]! + hex[2]! + hex[2]!;
  if (hex.length !== 6) return 0;

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function srgbToLinear(c: number): number {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
