/**
 * Badge Utilities: Status badges, notification badges, count indicators,
 * progress badges, verification badges, milestone badges, and badge groups.
 */

// --- Types ---

export type BadgeVariant = "default" | "primary" | "success" | "warning" | "error" | "info" | "neutral";
export type BadgeSize = "xs" | "sm" | "md" | "lg";
export type BadgeShape = "pill" | "rounded" | "rect";

export interface BaseBadgeOptions {
  /** Text content */
  text?: string | number;
  /** Visual variant */
  variant?: BadgeVariant;
  /** Size */
  size?: BadgeSize;
  /** Shape */
  shape?: BadgeShape;
  /** Icon HTML prefix */
  icon?: string;
  /** Dot mode (no text, just a dot) */
  dot?: boolean;
  /** Max value before showing "N+" */
  max?: number;
  /** Hide when value is zero/empty */
  hideWhenZero?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Custom class name */
  className?: string;
}

export interface NotificationBadgeOptions extends BaseBadgeOptions {
  /** Target element to anchor badge onto */
  target?: HTMLElement;
  /** Anchor position relative to target */
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  /** Offset from corner (px) */
  offset?: number;
  /** Pulse animation */
  pulse?: boolean;
  /** Ring around dot */
  ring?: boolean;
}

export interface ProgressBadgeOptions {
  /** Current value */
  value: number;
  /** Maximum value */
  max: number;
  /** Size */
  size?: BadgeSize;
  /** Show percentage text? */
  showPercent?: boolean;
  /** Color based on threshold */
  thresholds?: { warning: number; error: number };
  /** Animated fill? */
  animated?: boolean;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface VerificationBadgeOptions {
  /** User/display name */
  name: string;
  /** Verified status */
  verified?: boolean;
  /** Verification type: "blue-check", "gold", "business", "government" */
  type?: "blue-check" | "gold" | "business" | "government";
  /** Size */
  size?: "sm" | "md";
  /** Show tooltip */
  tooltip?: string;
  /** Click handler */
  onClick?: () => void;
  /** Container element */
  container?: HTMLElement;
}

export interface MilestoneBadgeOptions {
  /** Milestone label */
  label: string;
  /** Current step (1-indexed) */
  current: number;
  /** Total steps */
  total: number;
  /** Size */
  size?: "sm" | "md";
  /** Completed steps get special styling */
  completedStyle?: "filled" | "check" | "number";
  /** Container element */
  container?: HTMLElement;
}

// --- Color Map ---

const BADGE_VARIANT_MAP: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  default: { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" },
  primary: { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
  success: { bg: "#dcfce7", text: "#15803d", border: "#86efac" },
  warning: { bg: "#fef3c7", text: "#b45309", border: "#fcd34d" },
  error: { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" },
  info: { bg: "#e0f2fe", text: "#0369a1", border: "#7dd3fc" },
  neutral: { bg: "#f5f5f5", text: "#525252", border: "#e4e4e7" },
};

const BADGE_SIZES: Record<BadgeSize, { fontSize: string; padding: string; minWidth: string; dotSize: string }> = {
  xs: { fontSize: "9px", padding: "0 4px", minWidth: "12px", dotSize: "6px" },
  sm: { fontSize: "10px", padding: "1px 6px", minWidth: "16px", dotSize: "8px" },
  md: { fontSize: "11px", padding: "2px 8px", minWidth: "20px", dotSize: "10px" },
  lg: { fontSize: "13px", padding: "4px 12px", minWidth: "26px", dotSize: "12px" },
};

// --- CSS Keyframes ---

const BADGE_KEYFRAMES = `
@keyframes badgePulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.5; }
}
@keyframes badgeRingPulse {
  0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
  70% { box-shadow: 0 0 0 5px rgba(59,130,246,0); }
  100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
}
@keyframes badgeProgressFill {
  from { background-position: 0 0; }
  to { background-position: 30px 0; }
}
`;

let badgeStylesInjected = false;

function _injectBadgeStyles(): void {
  if (badgeStylesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.id = "badge-styles";
  style.textContent = BADGE_KEYFRAMES;
  document.head.appendChild(style);
  badgeStylesInjected = true;
}

// --- Core Factory: Basic Badge ---

/**
 * Create a status/count badge.
 *
 * @example
 * ```ts
 * const badge = createBasicBadge({ text: 42, variant: "error", size: "sm" });
 * container.appendChild(badge);
 * ```
 */
export function createBasicBadge(options: BaseBadgeOptions = {}): HTMLElement {
  const {
    text,
    variant = "default",
    size = "md",
    shape = "pill",
    icon,
    dot = false,
    max = 99,
    hideWhenZero = true,
    onClick,
    className,
  } = options;

  const vc = BADGE_VARIANT_MAP[variant];
  const sc = BADGE_SIZES[size];

  // Determine display text
  let displayText: string;
  if (dot) {
    displayText = "";
  } else if (typeof text === "number") {
    if (text === 0 && hideWhenZero) {
      const hidden = document.createElement("span");
      hidden.style.display = "none";
      return hidden;
    }
    displayText = text > max ? `${max}+` : String(text);
  } else {
    displayText = (text ?? "").trim();
    if (!displayText && hideWhenZero) {
      const hidden = document.createElement("span");
      hidden.style.display = "none";
      return hidden;
    }
  }

  const el = document.createElement("span");
  el.className = `basic-badge ${variant} ${size} ${shape} ${className ?? ""}`.trim();

  if (dot) {
    el.style.cssText =
      `display:inline-flex;width:${sc.dotSize};height:${sc.dotSize};` +
      `border-radius:50%;background:${vc.text};flex-shrink:0;`;
  } else {
    el.style.cssText =
      `display:inline-flex;align-items:center;justify-content:center;gap:3px;` +
      `font-size:${sc.fontSize};font-weight:600;line-height:1;` +
      `color:${vc.text};background:${vc.bg};border:1px solid ${vc.border};` +
      `padding:${sc.padding};min-width:${sc.minWidth};` +
      `border-radius:${shape === "pill" ? "9999px" : shape === "rounded" ? "6px" : "3px"};` +
      "white-space:nowrap;user-select:none;" +
      (onClick ? "cursor:pointer;" : "");
    el.textContent = displayText;
  }

  if (icon && !dot) {
    const iconEl = document.createElement("span");
    iconEl.innerHTML = icon;
    iconEl.style.cssText = "display:inline-flex;line-height:1;font-size:inherit;";
    el.insertBefore(iconEl, el.firstChild);
  }

  if (onClick) {
    el.addEventListener("click", onClick);
  }

  return el;
}

// --- Core Factory: Notification Badge ---

/**
 * Create a notification badge anchored to a target element.
 *
 * @example
 * ```ts
 * const nb = createNotificationBadge({
 *   target: avatarElement,
 *   text: 5,
 *   pulse: true,
 *   position: "top-right",
 * });
 * // Later:
 * nb.destroy();
 * ```
 */
export function createNotificationBadge(options: NotificationBadgeOptions): { el: HTMLElement; update: (text?: string | number) => void; destroy: () => void } {
  _injectBadgeStyles();

  const {
    target,
    position = "top-right",
    offset = 0,
    pulse = false,
    ring = false,
    ...baseOpts
  } = options;

  const badge = createBasicBadge({ ...baseOpts, size: baseOpts.size ?? "sm" });

  if (target) {
    // Ensure target has positioning
    if (getComputedStyle(target).position === "static") {
      target.style.position = "relative";
    }

    badge.style.position = "absolute";
    badge.style.zIndex = "10";

    switch (position) {
      case "top-right":
        badge.style.top = `${-2 + offset}px`;
        badge.style.right = `${-2 + offset}px`;
        break;
      case "top-left":
        badge.style.top = `${-2 + offset}px`;
        badge.style.left = `${-2 + offset}px`;
        break;
      case "bottom-right":
        badge.style.bottom = `${-2 + offset}px`;
        badge.style.right = `${-2 + offset}px`;
        break;
      case "bottom-left":
        badge.style.bottom = `${-2 + offset}px`;
        badge.style.left = `${-2 + offset}px`;
        break;
    }

    target.appendChild(badge);
  }

  // Pulse animation
  if (pulse) {
    badge.style.animation = "badgePulse 2s ease-in-out infinite";
  }

  // Ring effect
  if (ring) {
    badge.style.animation = badge.style.animation
      ? badge.style.animation + ", badgeRingPulse 2s ease-in-out infinite"
      : "badgeRingPulse 2s ease-in-out infinite";
  }

  function update(text?: string | number): void {
    if (text === undefined || text === null) {
      badge.style.display = "none";
      return;
    }
    badge.style.display = "";

    if (typeof text === "number") {
      const m = baseOpts.max ?? 99;
      badge.textContent = text > m ? `${m}+` : String(text);
    } else {
      badge.textContent = text;
    }
  }

  function destroy(): void {
    badge.remove();
  }

  return { el: badge, update, destroy };
}

// --- Core Factory: Progress Badge ---

/**
 * Create a circular progress badge (like a donut chart in badge form).
 *
 * @example
 * ```ts
 * const pb = createProgressBadge({ value: 75, max: 100, showPercent: true });
 * ```
 */
export function createProgressBadge(options: ProgressBadgeOptions): HTMLElement {
  _injectBadgeStyles();

  const {
    value,
    max,
    size = "md",
    showPercent = false,
    thresholds = { warning: 50, error: 80 },
    animated = false,
    className,
    container,
  } = options;

  const sc = BADGE_SIZES[size];
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  // Determine color based on thresholds
  let color: string;
  if (pct >= thresholds.error) color = BADGE_VARIANT_MAP.error.text;
  else if (pct >= thresholds.warning) color = BADGE_VARIANT_MAP.warning.text;
  else color = BADGE_VARIANT_MAP.success.text;

  const dimension = parseInt(sc.dotSize) * 3;
  const radius = (dimension - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);

  const root = document.createElement("div");
  root.className = `progress-badge ${size} ${className ?? ""}`.trim();
  root.style.cssText =
    `display:inline-flex;align-items:center;justify-content:center;position:relative;` +
    `width:${dimension}px;height:${dimension}px;`;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(dimension));
  svg.setAttribute("height", String(dimension));
  svg.setAttribute("viewBox", `0 0 ${dimension} ${dimension}`);

  // Background track
  const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  track.setAttribute("cx", String(dimension / 2));
  track.setAttribute("cy", String(dimension / 2));
  track.setAttribute("r", String(radius));
  track.setAttribute("fill", "none");
  track.setAttribute("stroke", "#e5e7eb");
  track.setAttribute("stroke-width", "3");
  svg.appendChild(track);

  // Progress arc
  const arc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  arc.setAttribute("cx", String(dimension / 2));
  arc.setAttribute("cy", String(dimension / 2));
  arc.setAttribute("r", String(radius));
  arc.setAttribute("fill", "none");
  arc.setAttribute("stroke", color);
  arc.setAttribute("stroke-width", "3");
  arc.setAttribute("stroke-linecap", "round");
  arc.setAttribute("stroke-dasharray", String(circumference));
  arc.setAttribute("stroke-dashoffset", String(dashOffset));
  arc.setAttribute("transform", `rotate(-90 ${dimension / 2} ${dimension / 2})`);
  if (animated) {
    arc.style.transition = "stroke-dashoffset 0.6s ease";
  }
  svg.appendChild(arc);

  root.appendChild(svg);

  // Center text
  if (showPercent) {
    const txt = document.createElement("span");
    txt.textContent = `${Math.round(pct)}%`;
    txt.style.cssText =
      `position:absolute;font-size:${sc.fontSize};font-weight:700;color:${color};` +
      "line-height:1;pointer-events:none;";
    root.appendChild(txt);
  }

  (container ?? document.body).appendChild(root);

  return root;
}

// --- Core Factory: Verification Badge ---

/**
 * Create a verification badge (checkmark + name).
 *
 * @example
 * ```ts
 * const vb = createVerificationBadge({
 *   name: "Elon Musk",
 *   verified: true,
 *   type: "gold",
 * });
 * ```
 */
export function createVerificationBadge(options: VerificationBadgeOptions): HTMLElement {
  const {
    name,
    verified = false,
    type = "blue-check",
    size = "md",
    tooltip,
    onClick,
    container,
  } = options;

  const root = document.createElement("span");
  root.className = `verification-badge ${type} ${size}`;
  root.style.cssText = "display:inline-flex;align-items:center;gap:4px;";

  // Name
  const nameEl = document.createElement("span");
  nameEl.className = "vb-name";
  nameEl.textContent = name;
  nameEl.style.cssText =
    `font-size:${size === "sm" ? "13px" : "15px"};font-weight:${size === "sm" ? "500" : "600"};color:#111827;`;
  root.appendChild(nameEl);

  // Check icon
  if (verified) {
    const checkColors: Record<string, { bg: string; check: string }> = {
      "blue-check": { bg: "#1d9bf0", check: "#fff" },
      gold: { bg: "#eab308", check: "#fff" },
      business: { bg: "#6366f1", check: "#fff" },
      government: { bg: "#64748b", check: "#fff" },
    };
    const cc = checkColors[type] ?? checkColors["blue-check"];

    const checkSize = size === "sm" ? 14 : 17;

    const check = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    check.setAttribute("width", String(checkSize));
    check.setAttribute("height", String(checkSize));
    check.setAttribute("viewBox", "0 0 24 24");
    check.innerHTML = `<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="${cc.check}"/>`;
    check.style.cssText = `background:${cc.bg};border-radius:50%;padding:2px;vertical-align:middle;`;

    if (tooltip) check.title = tooltip;
    root.appendChild(check);
  }

  if (onClick) {
    root.style.cursor = "pointer";
    root.addEventListener("click", onClick);
  }

  (container ?? document.body).appendChild(root);

  return root;
}

// --- Core Factory: Milestone Badge ---

/**
 * Create a step/milestone indicator badge.
 *
 * @example
 * ```ts
 * const mb = createMilestoneBadge({
 *   label: "Setup",
 *   current: 2,
 *   total: 4,
 *   completedStyle: "check",
 * });
 * ```
 */
export function createMilestoneBadge(options: MilestoneBadgeOptions): HTMLElement {
  const {
    label,
    current,
    total,
    size = "md",
    completedStyle = "filled",
    container,
  } = options;

  const root = document.createElement("div");
  root.className = `milestone-badge ${size}`;
  root.style.cssText =
    "display:inline-flex;align-items:center;gap:6px;";

  const stepSize = size === "sm" ? "22px" : "28px";
  const fontSize = size === "sm" ? "10px" : "12px";

  for (let i = 1; i <= total; i++) {
    const isCompleted = i < current;
    const isActive = i === current;
    const isPending = i > current;

    const step = document.createElement("div");
    step.className = `milestone-step ${isCompleted ? "completed" : isActive ? "active" : "pending"}`;

    if (completedStyle === "check" && isCompleted) {
      // Check circle
      step.style.cssText =
        `width:${stepSize};height:${stepSize};border-radius:50%;` +
        "display:flex;align-items:center;justify-content:center;" +
        "background:#22c55e;color:#fff;font-size:11px;font-weight:700;";
      step.innerHTML = "&#10003;";
    } else if (completedStyle === "filled" && isCompleted) {
      // Filled circle
      step.style.cssText =
        `width:${stepSize};height:${stepSize};border-radius:50%;` +
        "background:#22c55e;";
    } else {
      // Number circle
      step.style.cssText =
        `width:${stepSize};height:${stepSize};border-radius:50%;` +
        `display:flex;align-items:center;justify-content:center;` +
        `font-size:${fontSize};font-weight:600;` +
        (isActive
          ? "background:#3b82f6;color:#fff;border:2px solid #3b82f6;"
          : isCompleted
            ? "background:#22c55e;color:#fff;"
            : "background:#fff;color:#9ca3af;border:2px solid #e5e7eb;");
      step.textContent = String(i);
    }

    root.appendChild(step);

    // Connector line (not after last)
    if (i < total) {
      const connector = document.createElement("div");
      connector.className = "milestone-connector";
      connector.style.cssText =
        `width:16px;height:2px;background:${i < current ? "#22c55e" : "#e5e7eb"};` +
        "border-radius:1px;";
      root.appendChild(connector);
    }
  }

  // Label
  if (label) {
    const lbl = document.createElement("span");
    lbl.className = "milestone-label";
    lbl.textContent = label;
    lbl.style.cssText =
      `font-size:${size === "sm" ? "11px" : "13px"};color:#6b7280;margin-left:4px;`;
    root.appendChild(lbl);
  }

  (container ?? document.body).appendChild(root);

  return root;
}
