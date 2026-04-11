/**
 * Badge/Card Utilities: Product cards, feature cards, stat cards,
 * and badge overlays with configurable layouts, actions, badges,
 * hover effects, and responsive sizing.
 */

// --- Types ---

export type BadgePosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "new" | "sale" | "hot";
export type CardLayout = "vertical" | "horizontal" | "stacked" | "overlay";
export type CardSize = "sm" | "md" | "lg";

export interface BadgeOptions {
  /** Text content */
  text: string;
  /** Visual variant */
  variant?: BadgeVariant;
  /** Position on card */
  position?: BadgePosition;
  /** Custom icon (HTML string) */
  icon?: string;
  /** Pill shape */
  pill?: boolean;
  /** Dot indicator */
  dot?: boolean;
  /** Dismissible */
  dismissible?: boolean;
  /** Custom class name */
  className?: string;
}

export interface CardAction {
  /** Button label */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Variant: primary/secondary/ghost/danger */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** Icon (HTML string) */
  icon?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface CardMedia {
  /** Image URL or HTML content */
  src: string | HTMLElement;
  /** Alt text for images */
  alt?: string;
  /** Aspect ratio (e.g., "16/9", "1/1", "4/3") */
  aspectRatio?: string;
  /** Overlay content on image */
  overlay?: string | HTMLElement;
  /** Lazy load image */
  lazy?: boolean;
}

export interface CardStatsItem {
  /** Label */
  label: string;
  /** Value */
  value: string | number;
  /** Icon (HTML) */
  icon?: string;
  /** Trend: up/down/neutral */
  trend?: "up" | "down" | "neutral";
  /** Trend value */
  trendValue?: string;
}

export interface CardOptions {
  /** Card title */
  title?: string;
  /** Subtitle / description */
  subtitle?: string;
  /** Body text / HTML */
  body?: string | HTMLElement;
  /** Media section */
  media?: CardMedia;
  /** Badges to show on the card */
  badges?: BadgeOptions[];
  /** Action buttons at bottom */
  actions?: CardAction[];
  /** Stats row */
  stats?: CardStatsItem[];
  /** Layout mode */
  layout?: CardLayout;
  /** Size variant */
  size?: CardSize;
  /** Click handler (entire card) */
  onClick?: () => void;
  /** Hover effect */
  hoverEffect?: boolean;
  /** Selectable (checkbox/radio style) */
  selectable?: boolean;
  /** Selected state */
  selected?: boolean;
  /** Border radius */
  radius?: number;
  /** Shadow level (0-4) */
  shadow?: number;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface CardInstance {
  /** Root element */
  el: HTMLElement;
  /** Set selected state */
  setSelected: (selected: boolean) => void;
  /** Add a badge dynamically */
  addBadge: (badge: BadgeOptions) => void;
  /** Remove badge by text */
  removeBadge: (text: string) => void;
  /** Update body content */
  setBody: (content: string | HTMLElement) => void;
  /** Update title */
  setTitle: (title: string) => void;
  /** Show loading state */
  setLoading: (loading: boolean) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Color Maps ---

const BADGE_COLORS: Record<BadgeVariant, { bg: string; color: string; border?: string }> = {
  default: { bg: "#f3f4f6", color: "#374151" },
  success: { bg: "#dcfce7", color: "#166534" },
  warning: { bg: "#fef3c7", color: "#92400e" },
  error: { bg: "#fee2e2", color: "#991b1b" },
  info: { bg: "#dbeafe", color: "#1e40af" },
  new: { bg: "#ede9fe", color: "#5b21b6" },
  sale: { bg: "#fef2f2", color: "#dc2626" },
  hot: { bg: "#fff7ed", color: "#c2410c" },
};

const SIZE_STYLES: Record<CardSize, {
  padding: string; fontSize: { title: string; subtitle: string; body: string };
  gap: string; actionSize: string;
}> = {
  sm: {
    padding: "10px 12px",
    fontSize: { title: "14px", subtitle: "11px", body: "12px" },
    gap: "6px",
    actionSize: "sm",
  },
  md: {
    padding: "16px 18px",
    fontSize: { title: "17px", subtitle: "13px", body: "14px" },
    gap: "10px",
    actionSize: "md",
  },
  lg: {
    padding: "22px 26px",
    fontSize: { title: "21px", subtitle: "15px", body: "15px" },
    gap: "14px",
    actionSize: "lg",
  },
};

const SHADOWS = [
  "none",
  "0 1px 3px rgba(0,0,0,0.08)",
  "0 4px 6px rgba(0,0,0,0.07)",
  "0 8px 16px rgba(0,0,0,0.09)",
  "0 12px 28px rgba(0,0,0,0.12)",
];

// --- Badge Factory ---

function createBadgeElement(opts: BadgeOptions): HTMLElement {
  const { text, variant = "default", icon, pill = false, dot = false, dismissible = false, className } = opts;
  const colors = BADGE_COLORS[variant];

  const badge = document.createElement("span");
  badge.className = `card-badge ${variant} ${className ?? ""}`.trim();
  badge.style.cssText =
    `display:inline-flex;align-items:center;gap:4px;padding:${pill ? "4px 12px" : "3px 8px"};` +
    `background:${colors.bg};color:${colors.color};font-size:11px;font-weight:600;` +
    `border-radius:${pill ? "9999px" : "6px"};line-height:1.3;` +
    `white-space:nowrap;user-select:none;`;

  if (icon) {
    const iconEl = document.createElement("span");
    iconEl.className = "badge-icon";
    iconEl.innerHTML = icon;
    iconEl.style.cssText = "display:inline-flex;align-items:center;";
    badge.appendChild(iconEl);
  }

  if (dot) {
    const dotEl = document.createElement("span");
    dotEl.className = "badge-dot";
    dotEl.style.cssText =
      `width:6px;height:6px;border-radius:50%;background:${colors.color};flex-shrink:0;`;
    badge.appendChild(dotEl);
  }

  const textEl = document.createElement("span");
  textEl.className = "badge-text";
  textEl.textContent = text;
  badge.appendChild(textEl);

  if (dismissible) {
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.innerHTML = "&times;";
    closeBtn.style.cssText =
      "background:none;border:none;color:inherit;font-size:14px;" +
      "cursor:pointer;padding:0 2px;line-height:1;margin-left:2px;opacity:0.7;";
    closeBtn.addEventListener("click", () => badge.remove());
    badge.appendChild(closeBtn);
  }

  return badge;
}

// --- Core Factory ---

/**
 * Create a versatile card component.
 *
 * @example
 * ```ts
 * const card = createCard({
 *   title: "Pro Plan",
 *   subtitle: "$29/month",
 *   body: "Unlimited projects & team members",
 *   badges: [{ text: "Popular", variant: "hot", position: "top-right" }],
 *   actions: [{ label: "Upgrade", onClick: () => {}, variant: "primary" }],
 * });
 * ```
 */
export function createCard(options: CardOptions = {}): CardInstance {
  const {
    title,
    subtitle,
    body,
    media,
    badges = [],
    actions = [],
    stats = [],
    layout = "vertical",
    size = "md",
    onClick,
    hoverEffect = true,
    selectable = false,
    selected = false,
    radius = 12,
    shadow = 1,
    className,
    container,
  } = options;

  const ss = SIZE_STYLES[size];

  // Root
  const root = document.createElement("div");
  root.className = `ui-card ${layout} ${size} ${className ?? ""}`.trim();
  root.style.cssText =
    `position:relative;background:#fff;border-radius:${radius}px;` +
    `box-shadow:${SHADOWS[Math.min(shadow, SHADOWS.length - 1)]!important};` +
    `padding:${ss.padding};box-sizing:border-box;overflow:hidden;` +
    `transition:transform 0.2s ease, box-shadow 0.2s ease;` +
    (onClick ? "cursor:pointer;" : "") +
    (hoverEffect ? "" : "");

  if (hoverEffect && onClick) {
    root.addEventListener("mouseenter", () => {
      root.style.transform = "translateY(-2px)";
      root.style.boxShadow = SHADOWS[Math.min(shadow + 1, SHADOWS.length - 1)]!;
    });
    root.addEventListener("mouseleave", () => {
      root.style.transform = "";
      root.style.boxShadow = SHADOWS[shadow]!;
    });
  }

  // Badges layer
  const badgesLayer = document.createElement("div");
  badgesLayer.className = "card-badges-layer";
  badgesLayer.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:3;";

  const positionMap: Record<BadgePosition, string> = {
    "top-left": "top:8px;left:8px;",
    "top-right": "top:8px;right:8px;",
    "bottom-left": "bottom:8px;left:8px;",
    "bottom-right": "bottom:8px;right:8px;",
  };

  for (const b of badges) {
    const badgeEl = createBadgeElement(b);
    badgeEl.style.cssText += positionMap[b.position ?? "top-right"] + "position:relative;z-index:3;pointer-events:auto;";
    badgesLayer.appendChild(badgeEl);
  }
  if (badges.length > 0) root.appendChild(badgesLayer);

  // Content wrapper
  const inner = document.createElement("div");
  inner.className = "card-inner";
  inner.style.cssText =
    `display:flex;gap:${ss.gap};${layout === "horizontal" ? "flex-direction:row;" : "flex-direction:column;"}`;

  // Media
  if (media) {
    const mediaWrapper = document.createElement("div");
    mediaWrapper.className = "card-media";
    const ratio = media.aspectRatio ?? "16/9";
    const [rw, rh] = ratio.split("/").map(Number);

    mediaWrapper.style.cssText =
      `position:relative;width:100%;overflow:hidden;border-radius:${Math.max(radius - 4, 0)}px;` +
      `aspect-ratio:${ratio};background:#f3f4f6;`;

    if (typeof media.src === "string") {
      const img = document.createElement("img");
      img.className = "card-image";
      img.src = media.src;
      img.alt = media.alt ?? "";
      img.style.cssText =
        "width:100%;height:100%;object-fit:cover;display:block;" +
        (media.lazy ? "" : "");
      if (media.lazy) img.loading = "lazy";
      mediaWrapper.appendChild(img);
    } else {
      mediaWrapper.appendChild(media.src.cloneNode(true));
    }

    if (media.overlay) {
      const overlay = document.createElement("div");
      overlay.className = "card-media-overlay";
      overlay.style.cssText =
        "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
        "background:rgba(0,0,0,0.35);color:#fff;font-size:14px;font-weight:500;z-index:1;";
      if (typeof media.overlay === "string") overlay.textContent = media.overlay;
      else overlay.appendChild(media.overlay.cloneNode(true));
      mediaWrapper.appendChild(overlay);
    }

    inner.appendChild(mediaWrapper);
  }

  // Text content area
  const contentArea = document.createElement("div");
  contentArea.className = "card-content";
  contentArea.style.cssText =
    `display:flex;flex-direction:column;gap:${ss.gap};flex:1;min-width:0;`;

  if (title) {
    const titleEl = document.createElement("h3");
    titleEl.className = "card-title";
    titleEl.textContent = title;
    titleEl.style.cssText =
      `margin:0;font-size:${ss.fontSize.title};font-weight:700;color:#111827;line-height:1.3;`;
    contentArea.appendChild(titleEl);
  }

  if (subtitle) {
    const subEl = document.createElement("p");
    subEl.className = "card-subtitle";
    subEl.textContent = subtitle;
    subEl.style.cssText =
      `margin:0;font-size:${ss.fontSize.subtitle};color:#6b7280;line-height:1.4;`;
    contentArea.appendChild(subEl);
  }

  if (body) {
    const bodyEl = document.createElement("div");
    bodyEl.className = "card-body";
    if (typeof body === "string") {
      bodyEl.textContent = body;
    } else {
      bodyEl.appendChild(body.cloneNode(true));
    }
    bodyEl.style.cssText =
      `font-size:${ss.fontSize.body};color:#4b5563;line-height:1.6;`;
    contentArea.appendChild(bodyEl);
  }

  // Stats row
  if (stats.length > 0) {
    const statsRow = document.createElement("div");
    statsRow.className = "card-stats";
    statsRow.style.cssText =
      "display:flex;gap:16px;flex-wrap:wrap;padding-top:4px;";

    for (const s of stats) {
      const item = document.createElement("div");
      item.className = "card-stat-item";
      item.style.cssText = "display:flex;align-items:center;gap:5px;font-size:12px;";

      if (s.icon) {
        const ic = document.createElement("span");
        ic.innerHTML = s.icon;
        ic.style.cssText = "display:inline-flex;opacity:0.6;";
        item.appendChild(ic);
      }

      const val = document.createElement("span");
      val.className = "stat-value";
      val.textContent = String(s.value);
      val.style.cssText = "font-weight:600;color:#111827;";
      item.appendChild(val);

      const lbl = document.createElement("span");
      lbl.className = "stat-label";
      lbl.textContent = s.label;
      lbl.style.cssText = "color:#9ca3af;";
      item.appendChild(lbl);

      if (s.trend && s.trendValue) {
        const tr = document.createElement("span");
        tr.textContent = s.trendValue;
        tr.style.cssText =
          `font-size:11px;font-weight:500;${s.trend === "up" ? "color:#16a34a;" : s.trend === "down" ? "color:#dc2626;" : "color:#6b7280;"}`;
        item.appendChild(tr);
      }

      statsRow.appendChild(item);
    }
    contentArea.appendChild(statsRow);
  }

  inner.appendChild(contentArea);
  root.appendChild(inner);

  // Actions
  if (actions.length > 0) {
    const actionsRow = document.createElement("div");
    actionsRow.className = "card-actions";
    actionsRow.style.cssText =
      `display:flex;gap:8px;margin-top:${ss.gap};flex-wrap:wrap;`;

    const btnBase =
      "padding:7px 16px;border-radius:8px;border:none;font-size:13px;" +
      "font-weight:500;cursor:pointer;transition:all 0.15s;";

    for (const a of actions) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = a.label;

      switch (a.variant) {
        case "primary":
          btn.style.cssText = btnBase + "background:#3b82f6;color:#fff;";
          break;
        case "secondary":
          btn.style.cssText = btnBase + "background:#f3f4f6;color:#374151;";
          break;
        case "danger":
          btn.style.cssText = btnBase + "background:#fef2f2;color:#dc2626;";
          break;
        default:
          btn.style.cssText = btnBase + "background:transparent;color:#374151;";
      }

      if (a.disabled) {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
      }

      if (a.icon) {
        btn.innerHTML = `${a.icon} ${a.label}`;
      }

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        a.onClick();
      });

      actionsRow.appendChild(btn);
    }
    root.appendChild(actionsRow);
  }

  // Selection indicator
  let checkEl: HTMLElement | null = null;
  if (selectable) {
    checkEl = document.createElement("div");
    checkEl.className = "card-check";
    checkEl.style.cssText =
      `position:absolute;top:10px;left:10px;width:22px;height:22px;border-radius:6px;` +
      `border:2px solid #d1d5db;background:#fff;display:flex;align-items:center;justify-content:center;` +
      `transition:all 0.15s;z-index:4;cursor:pointer;${selected ? "border-color:#3b82f6;background:#3b82f6;" : ""}`;
    checkEl.innerHTML = selected
      ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>'
      : "";

    checkEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const newState = !selected;
      setSelected(newState);
      onClick?.();
    });

    root.appendChild(checkEl);
  }

  // Click handler
  if (onClick && !selectable) {
    root.addEventListener("click", () => onClick());
  }

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function setSelected(sel: boolean): void {
    if (!checkEl) return;
    if (sel) {
      checkEl.style.borderColor = "#3b82f6";
      checkEl.style.background = "#3b82f6";
      checkEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>';
    } else {
      checkEl.style.borderColor = "#d1d5db";
      checkEl.style.background = "#fff";
      checkEl.innerHTML = "";
    }
  }

  function addBadge(badge: BadgeOptions): void {
    const b = createBadgeElement(badge);
    b.style.cssText += positionMap[badge.position ?? "top-right"] + "position:relative;z-index:3;pointer-events:auto;";
    badgesLayer.appendChild(b);
  }

  function removeBadge(text: string): void {
    const existing = Array.from(badgesLayer.querySelectorAll(".badge-text"))
      .find((el) => el.textContent === text)?.parentElement;
    if (existing) existing.remove();
  }

  function setBody(content: string | HTMLElement): void {
    const bodyEl = root.querySelector(".card-body") as HTMLElement;
    if (!bodyEl) return;
    bodyEl.innerHTML = "";
    if (typeof content === "string") bodyEl.textContent = content;
    else bodyEl.appendChild(content.cloneNode(true));
  }

  function setTitle(t: string): void {
    const tEl = root.querySelector(".card-title") as HTMLElement;
    if (tEl) tEl.textContent = t;
  }

  function setLoading(loading: boolean): void {
    if (loading) {
      root.style.opacity = "0.6";
      root.style.pointerEvents = "none";
      const spinner = document.createElement("div");
      spinner.className = "card-loading-spinner";
      spinner.dataset.loading = "true";
      spinner.style.cssText =
        "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
        "background:rgba(255,255,255,0.8);z-index:10;border-radius:inherit;";
      spinner.innerHTML =
        '<div style="width:28px;height:28px;border:3px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;"></div>';
      root.appendChild(spinner);
    } else {
      root.style.opacity = "";
      root.style.pointerEvents = "";
      const spinner = root.querySelector('[data-loading="true"]');
      if (spinner) spinner.remove();
    }
  }

  function destroy(): void {
    root.remove();
  }

  return { el: root, setSelected, addBadge, removeBadge, setBody, setTitle, setLoading, destroy };
}

// --- Standalone Badge ---

/**
 * Create a standalone badge element (not attached to a card).
 *
 * @example
 * ```ts
 * const badge = createBadge({ text: "New", variant: "new", pill: true });
 * container.appendChild(badge);
 * ```
 */
export function createBadge(options: BadgeOptions): HTMLElement {
  return createBadgeElement(options);
}
