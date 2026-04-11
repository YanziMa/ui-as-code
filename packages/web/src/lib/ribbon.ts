/**
 * Ribbon: Decorative corner ribbon/badge component for marking items as
 * new, featured, sold out, etc., with multiple positions, colors,
 * sizes, animations, and auto-dismiss support.
 */

// --- Types ---

export type RibbonPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type RibbonVariant = "default" | "flat" | "folded" | "corner";
export type RibbonSize = "sm" | "md" | "lg";

export interface RibbonOptions {
  /** Container element or selector (the element to attach the ribbon to) */
  container: HTMLElement | string;
  /** Ribbon text */
  text: string;
  /** Position of the ribbon */
  position?: RibbonPosition;
  /** Visual variant */
  variant?: RibbonVariant;
  /** Size variant */
  size?: RibbonSize;
  /** Background color */
  color?: string;
  /** Text color */
  textColor?: string;
  /** Show icon before text? */
  icon?: string;
  /** Auto-dismiss after duration (ms), 0 = no dismiss */
  autoDismiss?: number;
  /** Click callback */
  onClick?: () => void;
  /** Dismiss callback */
  onDismiss?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface RibbonInstance {
  element: HTMLElement;
  /** Update ribbon text */
  setText: (text: string) => void;
  /** Update ribbon color */
  setColor: (color: string) => void;
  /** Dismiss/remove the ribbon */
  dismiss: () => void;
  /** Show the ribbon (after dismissing) */
  show: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Destroy completely */
  destroy: () => void;
}

// --- Size Config ---

const SIZE_MAP: Record<RibbonSize, { fontSize: number; padding: number; width: number; cornerSize: number }> = {
  sm: { fontSize: 9, padding: 4, width: 60, cornerSize: 40 },
  md: { fontSize: 11, padding: 6, width: 80, cornerSize: 52 },
  lg: { fontSize: 13, padding: 8, width: 100, cornerSize: 64 },
};

// --- Main Factory ---

export function createRibbon(options: RibbonOptions): RibbonInstance {
  const opts = {
    position: options.position ?? "top-right",
    variant: options.variant ?? "corner",
    size: options.size ?? "md",
    color: options.color ?? "#ef4444",
    textColor: options.textColor ?? "#fff",
    icon: options.icon,
    autoDismiss: options.autoDismiss ?? 0,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Ribbon: container not found");

  let visible = true;
  let destroyed = false;
  let dismissTimer: ReturnType<typeof setTimeout> | null = null;

  // Ensure container has position relative
  const originalPosition = getComputedStyle(container).position;
  if (originalPosition === "static") {
    container.style.position = "relative";
  }
  container.style.overflow = container.style.overflow === "hidden" ? "hidden" : container.style.overflow || "visible";

  const sz = SIZE_MAP[opts.size];

  // Create ribbon wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `ribbon-wrapper ribbon-${opts.position} ${opts.className}`;
  wrapper.style.cssText = `
    position:absolute;z-index:50;overflow:hidden;
    ${getPositionStyles(opts.position, sz.cornerSize)};
  `;

  // Build ribbon based on variant
  let ribbonEl: HTMLElement;

  switch (opts.variant) {
    case "folded":
      ribbonEl = createFoldedRibbon();
      break;
    case "flat":
      ribbonEl = createFlatRibbon();
      break;
    case "corner":
    default:
      ribbonEl = createCornerRibbon();
      break;
  }

  wrapper.appendChild(ribbonEl);
  container.appendChild(wrapper);

  // Auto-dismiss
  if (opts.autoDismiss > 0) {
    dismissTimer = setTimeout(() => dismiss(), opts.autoDismiss);
  }

  // --- Position Helpers ---

  function getPositionStyles(pos: RibbonPosition, size: number): string {
    switch (pos) {
      case "top-left": return `top:0;left:0;`;
      case "top-right": return `top:0;right:0;`;
      case "bottom-left": return `bottom:0;left:0;`;
      case "bottom-right": return `bottom:0;right:0;`;
    }
  }

  function getRotationAngle(pos: RibbonPosition): number {
    switch (pos) {
      case "top-left": return -45;
      case "top-right": return 45;
      case "bottom-left": return 45;
      case "bottom-right": return -45;
    }
  }

  function getTransformOrigin(pos: RibbonPosition): string {
    switch (pos) {
      case "top-left": return "0 0";
      case "top-right": return "100% 0";
      case "bottom-left": return "0 100%";
      case "bottom-right": return "100% 100%";
    }
  }

  // --- Variant Builders ---

  function createCornerRibbon(): HTMLElement {
    const el = document.createElement("div");
    el.className = "ribbon-corner";

    const isTop = opts.position.startsWith("top");
    const isLeft = opts.position.endsWith("left");
    const angle = getRotationAngle(opts.position);

    // Triangle/ribbon shape using CSS
    el.style.cssText = `
      position:absolute;
      ${isTop ? "top:" + (isLeft ? "8px" : "8px") : "bottom:" + (isLeft ? "8px" : "8px")};
      ${isLeft ? "left:-28px" : "right:-28px"};
      width:${sz.width}px;background:${opts.color};
      color:${opts.textColor};
      text-align:center;font-size:${sz.fontSize}px;font-weight:700;
      letter-spacing:1px;text-transform:uppercase;
      transform:rotate(${angle}deg);
      transform-origin:${getTransformOrigin(opts.position)};
      box-shadow:0 2px 6px rgba(0,0,0,0.15);
      padding:${sz.padding}px 20px;
      cursor:${opts.onClick ? "pointer" : "default"};
      transition:opacity 0.3s, transform 0.2s;
      user-select:none;-webkit-user-select:none;
    `;

    // Content
    if (opts.icon) {
      const iconSpan = document.createElement("span");
      iconSpan.innerHTML = opts.icon;
      iconSpan.style.cssText = "margin-right:4px;";
      el.appendChild(iconSpan);
    }
    const textSpan = document.createElement("span");
    textSpan.textContent = opts.text;
    el.appendChild(textSpan);

    // Hover
    el.addEventListener("mouseenter", () => {
      el.style.transform = `rotate(${angle}deg) scale(1.05)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = `rotate(${angle}deg)`;
    });

    if (opts.onClick) {
      el.addEventListener("click", () => opts.onClick?.());
    }

    return el;
  }

  function createFoldedRibbon(): HTMLElement {
    const el = document.createElement("div");
    el.className = "ribbon-folded";

    const isTop = opts.position.startsWith("top");
    const isLeft = opts.position.endsWith("left");

    el.style.cssText = `
      position:absolute;
      ${isTop ? "top:0;" : "bottom:0;"}
      ${isLeft ? "left:0;" : "right:0;"}
      background:${opts.color};
      color:${opts.textColor};
      font-size:${sz.fontSize}px;font-weight:700;
      text-transform:uppercase;letter-spacing:0.5px;
      padding:${sz.padding}px ${sz.padding + 10}px;
      box-shadow:0 2px 4px rgba(0,0,0,0.12);
      cursor:${opts.onClick ? "pointer" : "default"};
      z-index:2;
      transition:all 0.2s;
    `;

    // Fold triangle
    const foldSize = 14;
    const fold = document.createElement("div");
    fold.style.cssText = `
      position:absolute;
      ${isTop ? "bottom:100%;" : "top:100%;"}
      ${isLeft ? "right:0;" : "left:0;"}
      width:0;height:0;
      border-${isTop ? "bottom" : "top"}:${foldSize}px solid rgba(0,0,0,0.15);
      border-${isLeft ? "right" : "left"}:${foldSize}px solid transparent;
    `;
    el.appendChild(fold);

    // Content
    if (opts.icon) {
      const iconSpan = document.createElement("span");
      iconSpan.innerHTML = opts.icon;
      iconSpan.style.cssText = "margin-right:4px;";
      el.appendChild(iconSpan);
    }
    el.appendChild(document.createTextNode(opts.text));

    if (opts.onClick) el.addEventListener("click", () => opts.onClick?.());
    el.addEventListener("mouseenter", () => { el.style.filter = "brightness(1.1)"; });
    el.addEventListener("mouseleave", () => { el.style.filter = ""; });

    return el;
  }

  function createFlatRibbon(): HTMLElement {
    const el = document.createElement("div");
    el.className = "ribbon-flat";

    const isTop = opts.position.startsWith("top");
    const isLeft = opts.position.endsWith("left");

    el.style.cssText = `
      position:absolute;
      ${isTop ? "top:0;" : "bottom:0;"}
      ${isLeft ? "left:0;" : "right:0;"}
      background:${opts.color};
      color:${opts.textColor};
      font-size:${sz.fontSize}px;font-weight:600;
      padding:${sz.padding}px ${sz.padding + 8}px;
      border-radius:${isLeft ? "0 6px 6px 0" : "6px 0 0 6px"};
      box-shadow:0 1px 3px rgba(0,0,0,0.1);
      cursor:${opts.onClick ? "pointer" : "default"};
      white-space:nowrap;
      display:flex;align-items:center;gap:4px;
      transition:all 0.2s;
    `;

    if (opts.icon) {
      const iconSpan = document.createElement("span");
      iconSpan.innerHTML = opts.icon;
      el.appendChild(iconSpan);
    }
    el.appendChild(document.createTextNode(opts.text));

    if (opts.onClick) el.addEventListener("click", () => opts.onClick?.());
    el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.03)"; });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });

    return el;
  }

  // --- Public API ---

  function dismiss(): void {
    if (!visible || destroyed) return;
    if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null; }
    visible = false;
    wrapper.style.opacity = "0";
    wrapper.style.transform = "scale(0.8)";
    wrapper.style.pointerEvents = "none";
    setTimeout(() => { wrapper.style.display = "none"; }, 300);
    opts.onDismiss?.();
  }

  function show(): void {
    if (destroyed) return;
    visible = true;
    wrapper.style.display = "";
    requestAnimationFrame(() => {
      wrapper.style.opacity = "1";
      wrapper.style.transform = "";
      wrapper.style.pointerEvents = "";
    });
  }

  const instance: RibbonInstance = {
    element: wrapper,

    setText(text: string) {
      opts.text = text;
      const span = wrapper.querySelector(".ribbon-corner span:last-child, .ribbon-folded > :last-child, .ribbon-flat > :last-child");
      if (span && span.nodeType === Node.TEXT_NODE) {
        span.textContent = text;
      } else {
        // Rebuild content area
        rebuildContent();
      }
    },

    setColor(color: string) {
      opts.color = color;
      const ribbon = wrapper.firstChild as HTMLElement;
      if (ribbon) ribbon.style.background = color;
    },

    dismiss,
    show,

    isVisible() { return visible; },

    destroy() {
      destroyed = true;
      if (dismissTimer) clearTimeout(dismissTimer);
      wrapper.remove();
      if (originalPosition === "static") container.style.position = "";
    },
  };

  function rebuildContent(): void {
    // Simplified: just re-set textContent on inner elements
    const ribbons = wrapper.querySelectorAll(".ribbon-corner, .ribbon-folded, .ribbon-flat");
    ribbons.forEach(r => {
      // Keep first child (icon span if exists), replace text node
      const children = Array.from(r.childNodes);
      const textNode = children.find(c => c.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = opts.text;
    });
  }

  return instance;
}
