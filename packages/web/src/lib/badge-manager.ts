/**
 * Badge Manager: Dynamic badge/notification indicator system with
 * count display, dot indicators, status badges, animated counters,
 * overflow handling, positioning variants, and auto-hiding.
 */

// --- Types ---

export type BadgeVariant = "default" | "primary" | "success" | "warning" | "error" | "info";
export type BadgePosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";
export type BadgeSize = "sm" | "md" | "lg";
export type DotSize = "xs" | "sm" | "md";

export interface BadgeOptions {
  /** Target element to attach badge to */
  target: HTMLElement;
  /** Badge content: number (count), string (text), or null for dot mode */
  value?: number | string | null;
  /** Visual variant */
  variant?: BadgeVariant;
  /** Position relative to target */
  position?: BadgePosition;
  /** Size */
  size?: BadgeSize;
  /** Maximum count to show (e.g., 99 shows "99+") */
  maxCount?: number;
  /** Show zero? (default: false — hides when 0) */
  showZero?: boolean;
  /** Custom text for overflow (default: "{max}+") */
  overflowText?: string;
  /** Hide the badge entirely */
  hidden?: boolean;
  /** Pulse animation on update? */
  animate?: boolean;
  /** Offset in px from default position */
  offset?: { x: number; y: number };
  /** Custom CSS class */
  className?: string;
  /** Callback on click */
  onClick?: () => void;
}

export interface DotBadgeOptions {
  /** Target element */
  target: HTMLElement;
  /** Color (CSS value) */
  color?: string;
  /** Size variant */
  size?: DotSize;
  /** Position */
  position?: BadgePosition;
  /** Pulsing animation? */
  pulsing?: boolean;
  /** Visible? */
  visible?: boolean;
  /** Offset */
  offset?: { x: number; y: number };
}

export interface StatusBadgeOptions {
  /** Container or selector */
  container: HTMLElement | string;
  /** Status text */
  text: string;
  /** Variant */
  variant?: BadgeVariant;
  /** Size */
  size?: BadgeSize;
  /** Icon prefix (emoji or HTML) */
  icon?: string;
  /** Dismissible? */
  dismissible?: boolean;
  /** Rounded pill shape? */
  pill?: boolean;
  /** Outline style? */
  outline?: boolean;
  /** Callback on dismiss */
  onDismiss?: () => void;
}

export interface BadgeInstance {
  element: HTMLElement;
  /** Update the badge value */
  setValue: (value: number | string | null) => void;
  /** Get current value */
  getValue: () => number | string | null;
  /** Show the badge */
  show: () => void;
  /** Hide the badge */
  hide: () => void;
  /** Check visibility */
  isVisible: () => boolean;
  /** Update options dynamically */
  update: (options: Partial<BadgeOptions>) => void;
  /** Destroy and remove */
  destroy: () => void;
}

export interface DotBadgeInstance {
  element: HTMLElement;
  show: () => void;
  hide: () => void;
  setVisible: (visible: boolean) => void;
  setColor: (color: string) => void;
  destroy: () => void;
}

export interface StatusBadgeInstance {
  element: HTMLElement;
  setText: (text: string) => void;
  setVariant: (variant: BadgeVariant) => void;
  dismiss: () => void;
  destroy: () => void;
}

// --- Variant Colors ---

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; color: string }> = {
  default:  { bg: "#ef4444", color: "#fff" },
  primary:  { bg: "#4338ca", color: "#fff" },
  success:  { bg: "#22c55e", color: "#fff" },
  warning:  { bg: "#f59e0b", color: "#fff" },
  error:    { bg: "#ef4444", color: "#fff" },
  info:     { bg: "#3b82f6", color: "#fff" },
};

const SIZE_MAP: Record<BadgeSize, { fontSize: number; minWidth: number; padding: string; height: number }> = {
  sm:  { fontSize: 10, minWidth: 16, padding: "0 4px", height: 16 },
  md:  { fontSize: 11, minWidth: 18, padding: "0 5px", height: 18 },
  lg:  { fontSize: 12, minWidth: 20, padding: "0 6px", height: 20 },
};

const DOT_SIZE_MAP: Record<DotSize, { size: number }> = {
  xs: { size: 6 },
  sm: { size: 8 },
  md: { size: 10 },
};

// --- Position Helpers ---

function getPositionStyles(position: BadgePosition): { top?: string; bottom?: string; left?: string; right?: string } {
  switch (position) {
    case "top-right": return { top: "-4px", right: "-4px" };
    case "top-left": return { top: "-4px", left: "-4px" };
    case "bottom-right": return { bottom: "-4px", right: "-4px" };
    case "bottom-left": return { bottom: "-4px", left: "-4px" };
  }
}

// --- Count Badge Factory ---

export function createBadge(options: BadgeOptions): BadgeInstance {
  const opts = {
    value: options.value ?? null,
    variant: options.variant ?? "default",
    position: options.position ?? "top-right",
    size: options.size ?? "md",
    maxCount: options.maxCount ?? 99,
    showZero: options.showZero ?? false,
    overflowText: options.overflowText ?? "{max}+",
    hidden: options.hidden ?? false,
    animate: options.animate ?? true,
    offset: options.offset ?? { x: 0, y: 0 },
    className: options.className ?? "",
    ...options,
  };

  const vc = VARIANT_COLORS[opts.variant];
  const sz = SIZE_MAP[opts.size];
  const pos = getPositionStyles(opts.position);

  // Ensure target is positioned
  const targetStyle = getComputedStyle(options.target);
  if (targetStyle.position === "static") {
    options.target.style.position = "relative";
  }

  // Create badge element
  const el = document.createElement("span");
  el.className = `badge badge-${opts.variant} badge-${opts.size} ${opts.className}`;
  el.setAttribute("role", "status");
  el.style.cssText = `
    position:absolute;display:inline-flex;align-items:center;justify-content:center;
    min-width:${sz.minWidth}px;height:${sz.height}px;padding:${sz.padding};
    border-radius:${sz.height / 2}px;font-size:${sz.fontSize}px;font-weight:600;
    font-family:-apple-system,sans-serif;line-height:1;z-index:10;
    background:${vc.bg};color:${vc.color};
    ${pos.top ? `top:${pos.top};` : ""}
    ${pos.bottom ? `bottom:${pos.bottom};` : ""}
    ${pos.left ? `left:${pos.left};` : ""}
    ${pos.right ? `right:${pos.right};` : ""}
    transform:translate(${opts.offset.x}px, ${opts.offset.y}px);
    pointer-events:${opts.onClick ? "auto" : "none"};
    transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
    box-shadow:0 1px 3px rgba(0,0,0,0.2);
    white-space:nowrap;
  `;

  let currentValue = opts.value;

  function renderValue(): void {
    if (currentValue === null || currentValue === undefined) {
      // Dot mode — no text
      el.textContent = "";
      el.style.minWidth = "8px";
      el.style.padding = "0";
      el.style.borderRadius = "50%";
      return;
    }

    if (typeof currentValue === "number") {
      if (currentValue === 0 && !opts.showZero) {
        el.style.display = "none";
        return;
      }
      if (currentValue > opts.maxCount) {
        el.textContent = opts.overflowText.replace("{max}", String(opts.maxCount));
      } else {
        el.textContent = String(currentValue);
      }
    } else {
      el.textContent = currentValue;
    }
  }

  renderValue();
  if (opts.hidden) el.style.display = "none";

  if (opts.onClick) {
    el.addEventListener("click", opts.onClick);
    el.style.cursor = "pointer";
  }

  options.target.appendChild(el);

  const instance: BadgeInstance = {
    element: el,

    setValue(value: number | string | null) {
      const changed = currentValue !== value;
      currentValue = value;

      // Reset dimensions for non-dot mode
      if (value !== null && value !== undefined) {
        el.style.minWidth = `${sz.minWidth}px`;
        el.style.padding = sz.padding;
        el.style.borderRadius = `${sz.height / 2}px`;
      }

      renderValue();

      if (changed && opts.animate && !opts.hidden) {
        el.style.transform = `translate(${opts.offset.x}px, ${opts.offset.y - 3}px) scale(1.15)`;
        setTimeout(() => {
          el.style.transform = `translate(${opts.offset.x}px, ${opts.offset.y}px) scale(1)`;
        }, 200);
      }
    },

    getValue() { return currentValue; },

    show() {
      el.style.display = "";
      if (currentValue === 0 && !opts.showZero && typeof currentValue === "number") {
        el.style.display = "none";
      }
    },

    hide() { el.style.display = "none"; },

    isVisible() { return el.style.display !== "none"; },

    update(updates: Partial<BadgeOptions>) {
      Object.assign(opts, updates);
      if (updates.variant) {
        const newVc = VARIANT_COLORS[updates.variant];
        el.style.background = newVc.bg;
        el.style.color = newVc.color;
      }
      if (updates.value !== undefined) instance.setValue(updates.value!);
      if (updates.hidden !== undefined) updates.hidden ? instance.hide() : instance.show();
    },

    destroy() {
      el.remove();
    },
  };

  return instance;
}

// --- Dot Badge Factory ---

export function createDotBadge(options: DotBadgeOptions): DotBadgeInstance {
  const opts = {
    color: options.color ?? "#ef4444",
    size: options.size ?? "sm",
    position: options.position ?? "top-right",
    pulsing: options.pulsing ?? false,
    visible: options.visible ?? true,
    offset: options.offset ?? { x: 0, y: 0 },
    ...options,
  };

  const dsz = DOT_SIZE_MAP[opts.size];
  const pos = getPositionStyles(opts.position);

  const targetStyle = getComputedStyle(options.target);
  if (targetStyle.position === "static") {
    options.target.style.position = "relative";
  }

  const el = document.createElement("span");
  el.className = `dot-badge dot-${opts.size}`;
  el.style.cssText = `
    position:absolute;width:${dsz.size}px;height:${dsz.size}px;border-radius:50%;
    background:${opts.color};z-index:10;
    ${pos.top ? `top:${pos.top};` : ""}
    ${pos.bottom ? `bottom:${pos.bottom};` : ""}
    ${pos.left ? `left:${pos.left};` : ""}
    ${pos.right ? `right:${pos.right};` : ""}
    transform:translate(${opts.offset.x}px, ${opts.offset.y}px);
    box-shadow:0 0 0 2px #fff;
    ${opts.visible ? "" : "display:none;"}
    ${opts.pulsing ? "animation:dot-pulse 2s infinite;" : ""}
  `;

  // Inject pulse keyframes
  if (opts.pulsing && !document.getElementById("dot-badge-styles")) {
    const s = document.createElement("style");
    s.id = "dot-badge-styles";
    s.textContent = `
      @keyframes dot-pulse {
        0%, 100% { transform: translate(var(--dx, 0px), var(--dy, 0px)) scale(1); opacity: 1; }
        50% { transform: translate(var(--dx, 0px), var(--dy, 0px)) scale(1.5); opacity: 0.7; }
      }
    `;
    document.head.appendChild(s);
  }

  options.target.appendChild(el);

  return {
    element: el,

    show() { el.style.display = ""; },

    hide() { el.style.display = "none"; },

    setVisible(visible: boolean) {
      if (visible) el.style.display = ""; else el.style.display = "none";
    },

    setColor(color: string) { el.style.background = color; },

    destroy() { el.remove(); },
  };
}

// --- Status Badge Factory ---

export function createStatusBadge(options: StatusBadgeOptions): StatusBadgeInstance {
  const opts = {
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    pill: options.pill ?? true,
    outline: options.outline ?? false,
    dismissible: options.dismissible ?? false,
    ...options,
  };

  const vc = VARIANT_COLORS[opts.variant];

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("StatusBadge: container not found");

  const el = document.createElement("span");
  el.className = `status-badge status-${opts.variant}${opts.pill ? " pill" : ""}${opts.outline ? " outline" : ""}`;
  el.style.cssText = `
    display:inline-flex;align-items:center;gap:4px;
    padding:${opts.pill ? "3px 10px" : "2px 8px"};
    border-radius:${opts.pill ? "9999px" : "4px"};
    font-size:${opts.size === "sm" ? 11 : opts.size === "lg" ? 13 : 12}px;
    font-weight:500;font-family:-apple-system,sans-serif;line-height:1.4;
    background:${opts.outline ? "transparent" : vc.bg + "18"};
    color:${opts.outline ? vc.bg : vc.color};
    border:1px solid ${opts.outline ? vc.bg + "60" : "transparent"};
    transition:all 0.15s ease;
  `;

  if (opts.icon) {
    const iconEl = document.createElement("span");
    iconEl.innerHTML = opts.icon;
    iconEl.style.cssText = "font-size:13px;line-height:1;";
    el.appendChild(iconEl);
  }

  const textEl = document.createElement("span");
  textEl.textContent = options.text;
  el.appendChild(textEl);

  if (opts.dismissible) {
    const closeBtn = document.createElement("span");
    closeBtn.innerHTML = "&times;";
    closeBtn.style.cssText = `
      margin-left:2px;cursor:pointer;font-size:14px;line-height:1;
      opacity:0.6;transition:opacity 0.15s;
    `;
    closeBtn.addEventListener("mouseenter", () => { closeBtn.style.opacity = "1"; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn.style.opacity = "0.6"; });
    closeBtn.addEventListener("click", () => {
      opts.onDismiss?.();
      el.remove();
    });
    el.appendChild(closeBtn);
  }

  container.appendChild(el);

  return {
    element: el,

    setText(text: string) { textEl.textContent = text; },

    setVariant(variant: BadgeVariant) {
      const nvc = VARIANT_COLORS[variant];
      el.style.background = opts.outline ? "transparent" : nvc.bg + "18";
      el.style.color = opts.outline ? nvc.bg : nvc.color;
      el.style.borderColor = opts.outline ? nvc.bg + "60" : "transparent";
    },

    dismiss() { el.remove(); },

    destroy() { el.remove(); },
  };
}
