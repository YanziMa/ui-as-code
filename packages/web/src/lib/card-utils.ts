/**
 * Card Utilities: Card component with header, body, footer sections,
 * variants, image support, actions, and layout presets.
 */

// --- Types ---

export type CardVariant = "default" | "elevated" | "outlined" | "filled" | "borderless";
export type CardSize = "sm" | "md" | "lg";

export interface CardImageOptions {
  /** Image source URL */
  src: string;
  /** Alt text */
  alt?: string;
  /** Position ("top" | "background") */
  position?: "top" | "background";
  /** Height (px) */
  height?: number;
  /** Object fit */
  fit?: "cover" | "contain" | "fill";
}

export interface CardActionConfig {
  /** Action label */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Visual variant */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** Icon (HTML string) */
  icon?: string;
}

export interface CardOptions {
  /** Card title */
  title?: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Body content (HTMLElement or HTML string) */
  body?: HTMLElement | string;
  /** Header image */
  image?: CardImageOptions | string;
  /** Avatar/icon in header area */
  avatar?: string | HTMLElement;
  /** Footer actions */
  actions?: CardActionConfig[];
  /** Max number of visible actions before overflow */
  maxActions?: number;
  /** Card variant */
  variant?: CardVariant;
  /** Size variant */
  size?: CardSize;
  /** Click handler for entire card */
  onClick?: () => void;
  /** Hoverable? */
  hoverable?: boolean;
  /** Selected/active state */
  selected?: boolean;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

// --- Variant Styles ---

const CARD_VARIANTS: Record<CardVariant, { bg: string; border: string; shadow: string }> = {
  "default": { bg: "#ffffff", border: "#e5e7eb", shadow: "0 2px 8px rgba(0,0,0,0.08)" },
  "elevated": { bg: "#ffffff", border: "transparent", shadow: "0 4px 16px rgba(0,0,0,0.12)" },
  "outlined": { bg: "#ffffff", border: "#d1d5db", shadow: "none" },
  "filled": { bg: "#f9fafb", border: "transparent", shadow: "none" },
  "borderless": { bg: "transparent", border: "transparent", shadow: "none" },
};

const CARD_SIZES: Record<CardSize, { padding: string; radius: string }> = {
  "sm": { padding: "14px", radius: "10px" },
  "md": { padding: "20px", radius: "12px" },
  "lg": { padding: "24px", radius: "16px" },
};

// --- Core Factory ---

/**
 * Create a card component.
 *
 * @example
 * ```ts
 * const card = createCard({
 *   title: "Project Alpha",
 *   subtitle: "Web application framework",
 *   body: descriptionEl,
 *   image: "/project-thumb.jpg",
 *   actions: [
 *     { label: "View Details", onClick: () => navigate() },
 *     { label: "Star", onClick: () => star(), icon: "&#9733;" },
 *   ],
 *   variant: "elevated",
 *   hoverable: true,
 * });
 * ```
 */
export function createCard(options: CardOptions): HTMLElement {
  const {
    title,
    subtitle,
    body,
    image,
    avatar,
    actions,
    maxActions = 3,
    variant = "default",
    size = "md",
    onClick,
    hoverable = false,
    selected = false,
    className,
    container,
  } = options;

  const v = CARD_VARIANTS[variant];
  const s = CARD_SIZES[size];

  // Root
  const card = document.createElement("div");
  card.className = `card ${variant} ${size} ${className ?? ""}`.trim();
  card.style.cssText =
    `background:${v.bg};border:1px solid ${v.border};border-radius:${s.radius};` +
    `box-shadow:${v.shadow};overflow:hidden;display:flex;flex-direction:column;` +
    "transition:transform 0.15s ease, box-shadow 0.15s ease;" +
    (onClick ? "cursor:pointer;" : "") +
    (selected ? "ring:2px solid #93c5fd;" : "");

  if (hoverable && !onClick) {
    card.style.cursor = "default";
    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-2px)";
      card.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
      card.style.boxShadow = v.shadow;
    });
  }

  if (selected) {
    card.style.borderColor = "#93c5fd";
  }

  // Image
  if (image) {
    const imgOpts: CardImageOptions = typeof image === "string"
      ? { src: image, position: "top" }
      : image;

    const imgContainer = document.createElement("div");
    imgContainer.className = "card-image";

    if (imgOpts.position === "background") {
      imgContainer.style.cssText =
        `position:absolute;inset:0;overflow:hidden;`; // Will be positioned relative later
      const imgEl = document.createElement("img");
      imgEl.src = imgOpts.src;
      imgEl.alt = imgOpts.alt ?? "";
      imgEl.style.cssText =
        "width:100%;height:100%;object-fit:" + (imgOpts.fit ?? "cover") + ";display:block;";
      imgContainer.appendChild(imgEl);
      card.style.position = "relative";
      card.insertBefore(imgContainer, card.firstChild);
      // Push other content above the background image
      card.style.zIndex = "0";
    } else {
      imgContainer.style.cssText =
        `width:100%;overflow:hidden;height:${imgOpts.height ?? 180}px;` +
        "-webkit-flex-shrink:0;flex-shrink:0;";
      const imgEl = document.createElement("img");
      imgEl.src = imgOpts.src;
      imgEl.alt = imgOpts.alt ?? "";
      imgEl.style.width = "100%";
      imgEl.style.height = "100%";
      imgEl.style.objectFit = imgOpts.fit ?? "cover";
      imgEl.style.display = "block";
      imgContainer.appendChild(imgEl);
      card.appendChild(imgContainer);
    }
  }

  // Content wrapper
  const content = document.createElement("div");
  content.className = "card-content";
  content.style.cssText =
    `padding:${s.padding};display:flex;flex-direction:column;gap:8px;flex:1;min-width:0;`;

  // Header area (title + avatar)
  if (title || avatar || subtitle) {
    const header = document.createElement("div");
    header.className = "card-header";
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "12px";

    if (avatar) {
      const avEl = typeof avatar === "string"
        ? (() => { const img = document.createElement("img"); img.src = avatar!; img.style.width = "40px"; img.style.height = "40px"; img.style.borderRadius = "50%"; img.style.objectFit = "cover"; return img; })()
        : avatar as HTMLElement;
      avEl.style.flexShrink = "0";
      header.appendChild(avEl);
    }

    const textArea = document.createElement("div");
    textArea.style.flex = "1";
    textArea.style.minWidth = "0";

    if (title) {
      const titleEl = document.createElement("h3");
      titleEl.className = "card-title";
      titleEl.textContent = title;
      titleEl.style.cssText = "margin:0;font-size:15px;font-weight:600;color:#111827;line-height:1.3;";
      textArea.appendChild(titleEl);
    }

    if (subtitle) {
      const subEl = document.createElement("p");
      subEl.className = "card-subtitle";
      subEl.textContent = subtitle;
      subEl.style.cssText = "margin:0;font-size:13px;color:#6b7280;line-height:1.4;margin-top:2px;";
      textArea.appendChild(subEl);
    }

    header.appendChild(textArea);
    content.appendChild(header);
  }

  // Body
  if (body) {
    const bodyEl = document.createElement("div");
    bodyEl.className = "card-body";
    bodyEl.style.flex = "1";
    bodyEl.style.minHeight = "0";
    if (typeof body === "string") {
      bodyEl.innerHTML = body;
    } else {
      bodyEl.appendChild(body.cloneNode(true));
    }
    content.appendChild(bodyEl);
  }

  card.appendChild(content);

  // Actions / footer
  if (actions && actions.length > 0) {
    const footer = document.createElement("div");
    footer.className = "card-actions";
    footer.style.cssText =
      `padding:${s.padding};padding-top:0;border-top:1px solid #f3f4f6;` +
      "display:flex;gap:8px;align-items:center;flex-wrap:wrap;";

    const visibleActions = actions.slice(0, maxActions);
    const overflowCount = Math.max(0, actions.length - maxActions);

    visibleActions.forEach((action) => {
      const btn = document.createElement("button");
      btn.type = "button";
      if (action.icon) {
        btn.innerHTML = action.icon + " " + action.label;
      } else {
        btn.textContent = action.label;
      }
      btn.style.cssText =
        "padding:6px 14px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;" +
        "border:none;line-height:1;display:inline-flex;align-items:center;gap:4px;" +
        (action.variant === "primary"
          ? "background:#3b82f6;color:#fff;"
          : action.variant === "danger"
            ? "background:#fef2f2;color:#dc2626;"
            : action.variant === "ghost"
              ? "background:transparent;color:#6b7280;"
              : "background:#fff;color:#374151;border:1px solid #e5e7eb;");
      btn.addEventListener("click", action.onClick);
      footer.appendChild(btn);
    });

    // Overflow indicator
    if (overflowCount > 0) {
      const moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.textContent = `+${overflowCount}`;
      moreBtn.style.cssText =
        "padding:4px 10px;border-radius:6px;font-size:12px;font-weight:500;" +
        "background:#f3f4f6;color:#6b7280;border:none;cursor:pointer;line-height:1;";
      footer.appendChild(moreBtn);
    }

    card.appendChild(footer);
  }

  // Click handler
  if (onClick) {
    card.addEventListener("click", onClick);
  }

  if (container) container.appendChild(card);

  return card;
}
