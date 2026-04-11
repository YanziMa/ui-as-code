/**
 * Hover Card Utilities: Information card that appears on hover with
 * rich content sections, avatar, metadata, action links, side alignment,
 * animation, and portal rendering.
 */

// --- Types ---

export type HoverCardSide = "top" | "bottom" | "left" | "right";
export type HoverCardAnimation = "fade" | "scale" | "slide-up" | "slide-down";

export interface HoverCardAvatar {
  /** Avatar image URL */
  src: string;
  /** Alt text */
  alt?: string;
  /** Size in px (default: 40) */
  size?: number;
}

export interface HoverCardMeta {
  /** Label (e.g., "Joined") */
  label: string;
  /** Value (e.g., "March 2024") */
  value: string;
  /** Icon (HTML string) */
  icon?: string;
}

export interface HoverCardAction {
  /** Action text */
  text: string;
  /** Click handler */
  onClick?: () => void;
  /** Href link */
  href?: string;
  /** Variant */
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

export interface HoverCardContent {
  /** Title/heading */
  title: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Avatar config */
  avatar?: HoverCardAvatar | string;
  /** Body content (string or element) */
  body?: string | HTMLElement;
  /** Metadata items */
  meta?: HoverCardMeta[];
  /** Action links/buttons at bottom */
  actions?: HoverCardAction[];
  /** Badge text on avatar or title area */
  badge?: string;
  /** Status indicator color */
  statusColor?: string;
}

export interface HoverCardOptions {
  /** Target element to attach hover card to */
  target: HTMLElement;
  /** Card content */
  content: HoverCardContent;
  /** Which side to appear on */
  side?: HoverCardSide;
  /** Show delay (ms) */
  showDelay?: number;
  /** Hide delay (ms) */
  hideDelay?: number;
  /** Card width (px) */
  width?: number;
  /** Animation style */
  animation?: HoverCardAnimation;
  /** Show arrow indicator */
  arrow?: boolean;
  /** Offset from target (px) */
  offset?: number;
  /** Keep visible when hovering over the card itself */
  stickyHover?: boolean;
  /** Custom class name */
  className?: string;
  /** Called when shown */
  onShow?: () => void;
  /** Called when hidden */
  onHide?: () => void;
}

export interface HoverCardInstance {
  /** The hover card element */
  el: HTMLElement;
  /** Show manually */
  show(): void;
  /** Hide manually */
  hide(): void;
  /** Check if visible */
  isVisible(): boolean;
  /** Update content dynamically */
  updateContent(content: HoverCardContent): void;
  /** Reposition */
  reposition(): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Core Factory ---

/**
 * Create a hover card that appears near a target element.
 *
 * @example
 * ```ts
 * const card = createHoverCard({
 *   target: userLinkEl,
 *   content: {
 *     title: "Jane Doe",
 *     subtitle: "Product Designer @ Acme",
 *     avatar: "/avatars/jane.jpg",
 *     meta: [
 *       { label: "Joined", value: "Mar 2024", icon: "&#128197;" },
 *       { label: "Posts", value: "142" },
 *     ],
 *     actions: [
 *       { text: "View Profile", onClick: () => navigate("/u/jane") },
 *     ],
 *   },
 * });
 * ```
 */
export function createHoverCard(options: HoverCardOptions): HoverCardInstance {
  const {
    target,
    content,
    side = "bottom",
    showDelay = 300,
    hideDelay = 150,
    width = 320,
    animation = "scale",
    arrow = true,
    offset = 10,
    stickyHover = true,
    className,
    onShow,
    onHide,
  } = options;

  let _visible = false;
  let _showTimer: ReturnType<typeof setTimeout> | null = null;
  let _hideTimer: ReturnType<typeof setTimeout> | null = null;
  const cleanupFns: Array<() => void> = [];

  // Root element
  const el = document.createElement("div");
  el.className = `hover-card ${side} ${animation} ${className ?? ""}`.trim();
  el.setAttribute("role", "tooltip");
  el.style.cssText =
    `position:fixed;z-index:9998;width:${width}px;` +
    "background:#fff;border:1px solid #e5e7eb;border-radius:12px;" +
    "box-shadow:0 12px 36px rgba(0,0,0,0.14);opacity:0;pointer-events:none;" +
    "transition:opacity 0.18s ease, transform 0.18s ease;visibility:hidden;";

  // Arrow
  let arrowEl: HTMLElement | null = null;
  if (arrow) {
    arrowEl = document.createElement("div");
    arrowEl.className = "hover-card-arrow";
    arrowEl.style.cssText =
      "position:absolute;width:12px;height:12px;background:#fff;" +
      "border:1px solid #e5e7eb;transform:rotate(45deg);";
    el.appendChild(arrowEl);
  }

  // Inner container
  const inner = document.createElement("div");
  inner.className = "hover-card-inner";
  inner.style.cssText = "padding:16px;display:flex;flex-direction:column;gap:10px;";
  el.appendChild(inner);

  // --- Render Content ---

  function renderContent(): void {
    inner.innerHTML = "";

    // Header row: avatar + name + badge
    if (content.avatar || content.title) {
      const headerRow = document.createElement("div");
      headerRow.style.display = "flex";
      headerRow.style.alignItems = "center";
      headerRow.style.gap = "12px";

      // Avatar
      if (content.avatar) {
        const avSize = typeof content.avatar === "object" && "size" in content.avatar
          ? (content.avatar as HoverCardAvatar).size || 40 : 40;

        const avSrc = typeof content.avatar === "string"
          ? content.avatar
          : (content.avatar as HoverCardAvatar).src;

        const avAlt = typeof content.avatar === "object" && "alt" in content.avatar
          ? (content.avatar as HoverCardAvatar).alt || ""
          : "";

        const avatarEl = document.createElement("img");
        avatarEl.src = avSrc;
        avatarEl.alt = avAlt;
        avatarEl.style.cssText =
          `width:${avSize}px;height:${avSize}px;border-radius:50%;` +
          "object-fit:cover;flex-shrink:0;background:#f3f4f6;";

        if (content.statusColor) {
          const statusDot = document.createElement("span");
          statusDot.style.cssText =
            `position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;` +
            `background:${content.statusColor};border:2px solid #fff;`;
          avatarEl.style.position = "relative";
          avatarEl.appendChild(statusDot);
        }

        headerRow.appendChild(avatarEl);
      }

      // Name + badge area
      const nameArea = document.createElement("div");
      nameArea.style.flex = "1";
      nameArea.style.minWidth = "0";

      const titleEl = document.createElement("div");
      titleEl.className = "hover-card-title";
      titleEl.textContent = content.title;
      titleEl.style.cssText = "font-size:15px;font-weight:600;color:#111827;line-height:1.2;";
      nameArea.appendChild(titleEl);

      if (content.subtitle) {
        const subEl = document.createElement("div");
        subEl.className = "hover-card-subtitle";
        subEl.textContent = content.subtitle;
        subEl.style.cssText = "font-size:13px;color:#6b7280;margin-top:2px;line-height:1.3;";
        nameArea.appendChild(subEl);
      }

      if (content.badge) {
        const badgeEl = document.createElement("span");
        badgeEl.className = "hover-card-badge";
        badgeEl.textContent = content.badge;
        badgeEl.style.cssText =
          "display:inline-block;padding:1px 7px;font-size:10px;font-weight:600;" +
          "background:#eff6ff;color:#2563eb;border-radius:99px;margin-left:6px;";
        titleEl.appendChild(badgeEl);
      }

      headerRow.appendChild(nameArea);
      inner.appendChild(headerRow);
    }

    // Divider
    if ((content.body || content.meta) && (content.avatar || content.title)) {
      const divider = document.createElement("div");
      divider.style.height = "1px";
      divider.style.background = "#f3f4f6";
      inner.appendChild(divider);
    }

    // Body content
    if (content.body) {
      const bodyEl = document.createElement("div");
      bodyEl.className = "hover-card-body";
      bodyEl.style.cssText = "font-size:13px;color:#4b5563;line-height:1.5;";
      if (typeof content.body === "string") {
        bodyEl.innerHTML = content.body;
      } else {
        bodyEl.innerHTML = "";
        bodyEl.appendChild(content.body.cloneNode(true));
      }
      inner.appendChild(bodyEl);
    }

    // Metadata
    if (content.meta && content.meta.length > 0) {
      const metaGrid = document.createElement("div");
      metaGrid.className = "hover-card-meta";
      metaGrid.style.display = "grid";
      metaGrid.style.gridTemplateColumns = `repeat(${Math.min(content.meta.length, 2)}, 1fr)`;
      metaGrid.style.gap = "8px";

      content.meta.forEach((m) => {
        const item = document.createElement("div");
        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.gap = "4px";

        if (m.icon) {
          const iconSpan = document.createElement("span");
          iconSpan.innerHTML = m.icon;
          iconSpan.style.fontSize = "11px";
          item.appendChild(iconSpan);
        }

        const valEl = document.createElement("span");
        valEl.textContent = m.value;
        valEl.style.cssText = "font-size:13px;font-weight:500;color:#111827;";
        item.appendChild(valEl);

        const lblEl = document.createElement("span");
        lblEl.textContent = m.label;
        lblEl.style.cssText = "font-size:11px;color:#9ca3af;margin-left:auto;";
        item.appendChild(lblEl);

        metaGrid.appendChild(item);
      });

      inner.appendChild(metaGrid);
    }

    // Actions
    if (content.actions && content.actions.length > 0) {
      const actionsRow = document.createElement("div");
      actionsRow.className = "hover-card-actions";
      actionsRow.style.cssText =
        "display:flex;gap:6px;padding-top:8px;border-top:1px solid #f3f4f6;";

      content.actions.forEach((action) => {
        if (action.href) {
          const link = document.createElement("a");
          link.href = action.href;
          link.textContent = action.text;
          link.style.cssText =
            "font-size:12px;color:#3b82f6;text-decoration:none;font-weight:500;" +
            "transition:color 0.1s;";
          link.addEventListener("mouseenter", () => { link.style.color = "#2563eb"; });
          link.addEventListener("mouseleave", () => { link.style.color = "#3b82f6"; });
          actionsRow.appendChild(link);
        } else {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = action.text;
          const variantStyles: Record<string, string> = {
            primary: "background:#3b82f6;color:#fff;border:none;",
            secondary: "background:#f3f4f6;color:#374151;border:none;",
            ghost: "background:transparent;color:#6b7280;border:1px solid transparent;",
            danger: "background:#fef2f2;color:#dc2626;border:none;",
          };
          btn.style.cssText =
            "padding:5px 12px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;" +
            (variantStyles[action.variant ?? "primary"] ?? variantStyles.primary) +
            "transition:all 0.1s;";
          btn.addEventListener("click", () => { action.onClick?.(); });
          actionsRow.appendChild(btn);
        }
      });

      inner.appendChild(actionsRow);
    }
  }

  renderContent();

  document.body.appendChild(el);

  // --- Positioning ---

  function position(): void {
    const rect = target.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    let x: number, y: number;

    switch (side) {
      case "top":
        x = rect.left + rect.width / 2 - elRect.width / 2;
        y = rect.top - elRect.height - offset;
        break;
      case "bottom":
        x = rect.left + rect.width / 2 - elRect.width / 2;
        y = rect.bottom + offset;
        break;
      case "left":
        x = rect.left - elRect.width - offset;
        y = rect.top + rect.height / 2 - elRect.height / 2;
        break;
      case "right":
        x = rect.right + offset;
        y = rect.top + rect.height / 2 - elRect.height / 2;
        break;
      default:
        x = rect.left + rect.width / 2 - elRect.width / 2;
        y = rect.bottom + offset;
    }

    // Clamp to viewport
    x = Math.max(4, Math.min(x, window.innerWidth - elRect.width - 4));
    y = Math.max(4, Math.min(y, window.innerHeight - elRect.height - 4));

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    // Arrow positioning
    if (arrowEl && arrow) {
      positionArrow(rect, x, y);
    }
  }

  function positionArrow(targetRect: DOMRect, x: number, y: number): void {
    if (!arrowEl) return;
    const half = 6;

    switch (side) {
      case "top":
        arrowEl.style.bottom = `-${half + 1}px`;
        arrowEl.style.left = `${targetRect.left + targetRect.width / 2 - x - half}px`;
        break;
      case "bottom":
        arrowEl.style.top = `-${half + 1}px`;
        arrowEl.style.left = `${targetRect.left + targetRect.width / 2 - x - half}px`;
        break;
      case "left":
        arrowEl.style.right = `-${half + 1}px`;
        arrowEl.style.top = `${targetRect.top + targetRect.height / 2 - y - half}px`;
        break;
      case "right":
        arrowEl.style.left = `-${half + 1}px`;
        arrowEl.style.top = `${targetRect.top + targetRect.height / 2 - y - half}px`;
        break;
    }

    arrowEl.style.borderWidth = "1px";
    arrowEl.style.borderStyle = "solid";
  }

  // --- Show/Hide ---

  function show(): void {
    if (_visible) return;
    if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }

    _showTimer = setTimeout(() => {
      _visible = true;
      position();
      applyAnimation(true);
      el.style.visibility = "visible";
      el.style.pointerEvents = stickyHover ? "auto" : "none";
      onShow?.();
    }, showDelay);
  }

  function hide(): void {
    if (!_visible) return;
    if (_showTimer) { clearTimeout(_showTimer); _showTimer = null; }

    _hideTimer = setTimeout(() => {
      _visible = false;
      applyAnimation(false);
      el.style.pointerEvents = "none";
      setTimeout(() => { el.style.visibility = "hidden"; }, 180);
      onHide?.();
    }, hideDelay);
  }

  function applyAnimation(showing: boolean): void {
    switch (animation) {
      case "fade":
        el.style.opacity = showing ? "1" : "0";
        el.style.transform = "";
        break;
      case "scale":
        el.style.opacity = showing ? "1" : "0";
        el.style.transform = showing ? "scale(1)" : "scale(0.96)";
        break;
      case "slide-up":
        el.style.opacity = showing ? "1" : "0";
        el.style.transform = showing ? "translateY(0)" : "translateY(6px)";
        break;
      case "slide-down":
        el.style.opacity = showing ? "1" : "0";
        el.style.transform = showing ? "translateY(0)" : "translateY(-6px)";
        break;
    }
  }

  // --- Event Bindings ---

  target.addEventListener("mouseenter", show);
  target.addEventListener("mouseleave", hide);
  cleanupFns.push(
    () => target.removeEventListener("mouseenter", show),
    () => target.removeEventListener("mouseleave", hide),
  );

  if (stickyHover) {
    el.addEventListener("mouseenter", () => { if (_showTimer) clearTimeout(_showTimer); });
    el.addEventListener("mouseleave", hide);
    cleanupFns.push(
      () => el.removeEventListener("mouseenter", () => {}),
      () => el.removeEventListener("mouseleave", hide),
    );
  }

  // --- Instance ---

  return {
    el,

    show, hide,

    isVisible() { return _visible; },

    updateContent(newContent: HoverCardContent) {
      content = newContent;
      renderContent();
      if (_visible) position();
    },

    reposition() { if (_visible) position(); },

    destroy() {
      hide();
      for (const fn of cleanupFns) fn();
      el.remove();
    },
  };
}
