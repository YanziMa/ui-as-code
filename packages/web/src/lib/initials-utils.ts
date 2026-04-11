/**
 * Initials Utilities: Avatar initials generation, color assignment,
 * multi-initial patterns, group initial displays, abbreviation utilities,
 * and consistent hashing for deterministic colors.
 */

// --- Types ---

export type InitialsStyle = "circular" | "rounded" | "square" | "hexagonal";
export type InitialsSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface InitialsOptions {
  /** Full name or text */
  text: string;
  /** Max characters to show (default 2) */
  maxChars?: number;
  /** Style variant */
  style?: InitialsStyle;
  /** Size variant */
  size?: InitialsSize;
  /** Custom background color */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
  /** Font weight */
  fontWeight?: string;
  /** Border radius override */
  borderRadius?: string;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface InitialsGroupOptions {
  /** Items: each with a text/label for initials */
  items: Array<{
    key: string;
    text: string;
    color?: string;
    tooltip?: string;
    onClick?: () => void;
  }>;
  /** Size of each initial */
  size?: InitialsSize;
  /** Style of each initial */
  style?: InitialsStyle;
  /** Overlap between items (px, negative = overlap) */
  overlap?: number;
  /** Max visible before "+N" overflow */
  maxVisible?: number;
  /** Show tooltips on hover */
  showTooltips?: boolean;
  /** Container element */
  container?: HTMLElement;
}

// --- Color Palette ---

const INITIALS_PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#78716c", "#0d9488", "#2563eb",
];

// --- Size Map ---

const SIZE_MAP: Record<InitialsSize, { dimension: string; fontSize: string }> = {
  xs: { dimension: "24px", fontSize: "9px" },
  sm: { dimension: "32px", fontSize: "11px" },
  md: { dimension: "40px", fontSize: "13px" },
  lg: { dimension: "48px", fontSize: "16px" },
  xl: { dimension: "64px", fontSize: "20px" },
};

// --- Hashing ---

/**
 * Generate a deterministic hash number from a string.
 * Uses djb2-like algorithm for consistent results.
 */
export function hashString(str: string): number {
  if (!str) return 0;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Pick a color from the palette based on input string.
 * Same input always returns same color.
 */
export function getColorForString(input: string): string {
  if (!input) return INITIALS_PALETTE[0];
  return INITIALS_PALETTE[hashString(input) % INITIALS_PALETTE.length];
}

/**
 * Get contrasting text color (white or dark) for a given background.
 */
export function getContrastColor(hexColor: string): string {
  // Parse hex
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Relative luminance approximation
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#1f2937" : "#ffffff";
}

// --- Initials Extraction ---

/**
 * Extract initials from a name/text string.
 *
 * Rules:
 * - Single word: first 1-2 characters
 * - Multiple words: first char of first + first char of last word
 * - Email: part before @, treated as name
 * - Respects maxChars limit
 *
 * @example
 * ```ts
 * getInitials("Alice Johnson");     // "AJ"
 * getInitials("Alice");             // "AL"
 * getInitials("alice@example.com"); // "AL"
 * getInitials("Dr. Jane Marie Smith"); // "DS"
 * ```
 */
export function getInitials(text: string, maxChars = 2): string {
  if (!text || !text.trim()) return "?";

  let cleaned = text.trim();

  // Handle email addresses
  if (cleaned.includes("@")) {
    cleaned = cleaned.split("@")[0]!;
    // Replace dots, underscores, plus signs with spaces for splitting
    cleaned = cleaned.replace(/[._+]/g, " ");
  }

  // Remove common prefixes/titles
  cleaned = cleaned.replace(/^(Mr|Mrs|Ms|Miss|Dr|Prof|Sir|Lady|Lord|Hon|Sr|Jr|PhD|MD|Esq)\.?\s*/i, "");

  // Split into words
  const parts = cleaned.split(/\s+/).filter((p) => p.length > 0);

  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    // Single word: take up to maxChars from start
    return parts[0]!.slice(0, Math.max(maxChars, 1)).toUpperCase();
  }

  // Multi-word: first + last
  const first = parts[0]![0]!;
  const last = parts[parts.length - 1]![0]!;

  if (maxChars <= 1) return first.toUpperCase();
  return (first + last).toUpperCase();
}

/**
 * Extract all meaningful initials (more than 2 chars).
 * Useful for displaying organization abbreviations.
 *
 * @example
 * ```ts
 * getFullInitials("United Nations International Children's Fund"); // "UNIC"
 * ```
 */
export function getFullInitials(text: string, maxChars = 4): string {
  if (!text || !text.trim()) return "?";

  const cleaned = text.trim()
    .replace(/^(Mr|Mrs|Ms|Miss|Dr|Prof|Sir|Lady|Lord|Hon|Sr|Jr)\.?\s*/i, "")
    .replace(/\b(and|of|the|for|in|on|at|to|a|an|by|with|from)\b/gi, " ")
    .trim();

  const words = cleaned.split(/\s+/).filter((w) => w.length > 0 && /^[A-Z]/i.test(w));
  const result = words.slice(0, maxChars).map((w) => w[0]!.toUpperCase()).join("");
  return result || "?";
}

/**
 * Create an abbreviation from a camelCase or snake_case identifier.
 *
 * @example
 * ```ts
 * getAbbreviation("getUserById");   // "UBI"
 * getAbbreviation("HTTPServer");    // "HS"
 * getAbbreviation("user_id_count"); // "UIC"
 * ```
 */
export function getAbbreviation(identifier: string, maxChars = 3): string {
  if (!identifier) return "?";

  // Split camelCase
  const parts = identifier
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length <= maxChars) {
    return parts.map((p) => p[0]!.toUpperCase()).join("");
  }

  // Take first char of each, capped at maxChars
  return parts.slice(0, maxChars).map((p) => p[0]!.toUpperCase()).join("");
}

// --- Core Factory: Initials Element ---

/**
 * Create an initials display element (avatar-style).
 *
 * @example
 * ```ts
 * const el = createInitials({
 *   text: "Alice Johnson",
 *   size: "md",
 *   style: "circular",
 * });
 * document.body.appendChild(el);
 * ```
 */
export function createInitials(options: InitialsOptions): HTMLElement {
  const {
    text,
    maxChars = 2,
    style = "circular",
    size = "md",
    backgroundColor,
    textColor,
    fontWeight,
    borderRadius,
    className,
    container,
  } = options;

  const ss = SIZE_MAP[size];
  const bg = backgroundColor ?? getColorForString(text);
  const tc = textColor ?? getContrastColor(bg);
  const initials = getInitials(text, maxChars);

  const el = document.createElement("div");
  el.className = `initials ${style} ${size} ${className ?? ""}`.trim();
  el.setAttribute("aria-label", text);

  // Shape-based border radius
  let radius: string;
  switch (style) {
    case "circular":
      radius = "50%";
      break;
    case "rounded":
      radius = "12px";
      break;
    case "hexagonal":
      radius = "8px";
      break;
    default:
      radius = "4px";
  }

  el.style.cssText =
    `display:inline-flex;align-items:center;justify-content:center;` +
    `width:${ss.dimension};height:${ss.dimension};` +
    `background:${bg};color:${tc};` +
    `font-size:${ss.fontSize};font-weight:${fontWeight ?? "600"};` +
    `border-radius:${borderRadius ?? radius};` +
    "line-height:1;user-select:none;flex-shrink:0;" +
    (style === "hexagonal" ? "clip-path:polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);" : "");

  el.textContent = initials;

  (container ?? document.body).appendChild(el);

  return el;
}

// --- Core Factory: Initials Group ---

/**
 * Create a stacked initials group (like avatar groups but using initials only).
 *
 * @example
 * ```ts
 * const group = createInitialsGroup({
 *   items: [
 *     { key: "1", text: "Alice Johnson" },
 *     { key: "2", text: "Bob Smith" },
 *     { key: "3", text: "Charlie Brown" },
 *     { key: "4", text: "Diana Prince" },
 *     { key: "5", text: "Eve Nari" },
 *   ],
 *   size: "sm",
 *   maxVisible: 3,
 * });
 * ```
 */
export function createInitialsGroup(options: InitialsGroupOptions): HTMLElement {
  const {
    items,
    size = "sm",
    style = "circular",
    overlap = -10,
    maxVisible = items.length,
    showTooltips = false,
    container,
  } = options;

  const ss = SIZE_MAP[size];

  const root = document.createElement("div");
  root.className = "initials-group";
  root.style.cssText = "display:flex;align-items:center;";

  const visibleCount = Math.min(maxVisible, items.length);
  const overflowCount = items.length - visibleCount;

  for (let i = 0; i < visibleCount; i++) {
    const item = items[i]!;
    const color = item.color ?? getColorForString(item.text);
    const initials = getInitials(item.text);

    const el = document.createElement("div");
    el.className = "initials-group-item";
    el.style.cssText =
      `display:inline-flex;align-items:center;justify-content:center;` +
      `width:${ss.dimension};height:${ss.dimension};` +
      `background:${color};color:${getContrastColor(color)};` +
      `font-size:${ss.fontSize};font-weight:600;border-radius:${style === "circular" ? "50%" : style === "rounded" ? "12px" : "4px"};` +
      "line-height:1;user-select:none;flex-shrink:0;" +
      "border:2px solid #fff;box-sizing:border-box;" +
      `margin-left:${i > 0 ? `${overlap}px` : "0"};` +
      `z-index:${visibleCount - i};` +
      (item.onClick ? "cursor:pointer;" : "") +
      "transition:transform 0.15s ease;";

    el.textContent = initials;
    el.setAttribute("aria-label", item.text);

    if (showTooltips && item.tooltip) {
      el.title = item.tooltip;
    }

    if (item.onClick) {
      el.addEventListener("click", item.onClick);
      el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.1) translateY(-2px)"; });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    }

    root.appendChild(el);
  }

  // Overflow indicator
  if (overflowCount > 0) {
    const overflow = document.createElement("div");
    overflow.className = "initials-overflow";
    overflow.textContent = `+${overflowCount}`;
    overflow.style.cssText =
      `display:inline-flex;align-items:center;justify-content:center;` +
      `width:${ss.dimension};height:${ss.dimension};` +
      `background:#f3f4f6;color:#6b7280;font-size:${size === "xs" ? "9px" : size === "sm" ? "10px" : size === "md" ? "11px" : "13px"};` +
      `font-weight:600;border-radius:${style === "circular" ? "50%" : style === "rounded" ? "12px" : "4px"};` +
      "line-height:1;user-select:none;flex-shrink:0;" +
      "border:2px solid #fff;box-sizing:border-box;" +
      `margin-left:${overlap}px;z-index:0;` +
      "cursor:pointer;font-variant-numeric:tabular-nums;";

    root.appendChild(overflow);
  }

  (container ?? document.body).appendChild(root);

  return root;
}
