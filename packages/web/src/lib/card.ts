/**
 * Card: Versatile card container with header, body, footer, image areas,
 * variants (elevated/outlined/filled/ghost), sizes, hover effects,
 * action slots, and responsive layout support.
 */

// --- Types ---

export type CardVariant = "elevated" | "outlined" | "filled" | "ghost" | "interactive";
export type CardSize = "sm" | "md" | "lg";

export interface CardHeaderOptions {
  /** Title text */
  title?: string;
  /** Subtitle text */
  subtitle?: string;
  /** Avatar/image element or URL */
  avatar?: string | HTMLElement;
  /** Action buttons/elements on the right */
  actions?: HTMLElement | HTMLElement[];
  /** Show divider below header? */
  divided?: boolean;
}

export interface CardImageOptions {
  /** Image source URL */
  src: string;
  /** Alt text */
  alt?: string;
  /** Position: "top", "bottom", "left", "full" */
  position?: "top" | "bottom" | "left" | "full";
  /** Object fit */
  objectFit?: string;
  /** Height for top/bottom images */
  height?: string;
  /** Aspect ratio (e.g., "16/9") */
  aspectRatio?: string;
}

export interface CardOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Visual variant */
  variant?: CardVariant;
  /** Size preset */
  size?: CardSize;
  /** Width (CSS value) */
  width?: string;
  /** Max width */
  maxWidth?: string;
  /** Header configuration */
  header?: CardHeaderOptions;
  /** Body content (string, HTML, or element) */
  body?: string | HTMLElement;
  /** Footer content */
  footer?: string | HTMLElement;
  /** Image configuration */
  image?: CardImageOptions;
  /** Hover effect (for interactive variant) */
  hoverable?: boolean;
  /** Padding override */
  padding?: string;
  /** Border radius override */
  borderRadius?: string | number;
  /** Custom CSS class */
  className?: string;
  /** Click handler (for interactive cards) */
  onClick?: () => void;
}

export interface CardInstance {
  element: HTMLElement;
  setBody: (content: string | HTMLElement) => void;
  setHeader: (header: Partial<CardHeaderOptions>) => void;
  setFooter: (content: string | HTMLElement) => void;
  setImage: (image: CardImageOptions) => void;
  destroy: () => void;
}

// --- Config ---

const VARIANT_STYLES: Record<CardVariant, {
  bg: string; border: string; shadow: string; hoverShadow: string;
}> = {
  elevated:   { bg: "#fff", border: "1px solid #e5e7eb", shadow: "0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.06)", hoverShadow: "0 8px 25px rgba(0,0,0,0.12)" },
  outlined:   { bg: "#fff", border: "2px solid #e5e7eb", shadow: "none", hoverShadow: "0 4px 12px rgba(0,0,0,0.08)" },
  filled:     { bg: "#f9fafb", border: "none", shadow: "none", hoverShadow: "0 4px 12px rgba(0,0,0,0.06)" },
  ghost:      { bg: "transparent", border: "none", shadow: "none", hoverShadow: "none" },
  interactive:{ bg: "#fff", border: "1px solid #e5e7eb", shadow: "0 1px 3px rgba(0,0,0,0.06)", hoverShadow: "0 8px 25px rgba(99,102,241,0.15)" },
};

const SIZE_PADDING: Record<CardSize, string> = {
  sm: "12px",
  md: "20px",
  lg: "28px",
};

// --- Main Factory ---

export function createCard(options: CardOptions): CardInstance {
  const opts = {
    variant: options.variant ?? "elevated",
    size: options.size ?? "md",
    hoverable: options.hoverable ?? false,
    padding: options.padding,
    borderRadius: options.borderRadius ?? 12,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Card: container not found");

  const v = VARIANT_STYLES[opts.variant];
  const pad = opts.padding ?? SIZE_PADDING[opts.size];

  // Main card element
  const card = document.createElement("div");
  card.className = `card card-${opts.variant} card-${opts.size} ${opts.className}`;
  card.style.cssText = `
    background:${v.bg};border:${v.border};
    box-shadow:${v.shadow};border-radius:${typeof opts.borderRadius === "number" ? `${opts.borderRadius}px` : opts.borderRadius};
    overflow:hidden;width:${opts.width ?? "100%"};
    max-width:${opts.maxWidth ?? "100%"};box-sizing:border-box;
    font-family:-apple-system,sans-serif;color:#374151;
    transition:box-shadow 0.2s ease,transform 0.15s ease;
    ${opts.variant === "interactive" ? "cursor:pointer;" : ""}
  `;

  // Hover effect
  if (opts.hoverable || opts.variant === "interactive") {
    card.addEventListener("mouseenter", () => {
      card.style.boxShadow = v.hoverShadow;
      if (opts.variant === "interactive") card.style.transform = "translateY(-2px)";
    });
    card.addEventListener("mouseleave", () => {
      card.style.boxShadow = v.shadow;
      if (opts.variant === "interactive") card.style.transform = "";
    });
  }

  // Click handler
  if (opts.onClick && (opts.variant === "interactive" || opts.hoverable)) {
    card.addEventListener("click", () => opts.onClick!());
  }

  container.appendChild(card);

  // Track sections
  let headerEl: HTMLElement | null = null;
  let bodyEl: HTMLElement | null = null;
  let footerEl: HTMLElement | null = null;
  let imageEl: HTMLImageElement | null = null;

  // Build image
  if (opts.image) buildImage(opts.image);

  // Build header
  if (opts.header) buildHeader(opts.header);

  // Build body
  if (opts.body !== undefined) buildBody(opts.body);

  // Build footer
  if (opts.footer) buildFooter(opts.footer);

  // --- Section builders ---

  function buildImage(imgOpts: CardImageOptions): void {
    const imgWrap = document.createElement("div");
    imgWrap.className = "card-image";

    const img = document.createElement("img");
    img.src = imgOpts.src;
    img.alt = imgOpts.alt ?? "";
    img.style.cssText = `
      width:100%;display:block;object-fit:${imgOpts.objectFit ?? "cover"};
    `;

    switch (imgOpts.position) {
      case "top":
        img.style.height = imgOpts.height ?? "180px";
        card.insertBefore(imgWrap, card.firstChild);
        break;
      case "bottom":
        img.style.height = imgOpts.height ?? "180px";
        card.appendChild(imgWrap);
        break;
      case "left":
        card.style.display = "flex";
        imgWrap.style.cssText += `width:200px;min-width:200px;flex-shrink:0;`;
        card.insertBefore(imgWrap, card.firstChild);
        break;
      case "full":
        imgWrap.style.cssText += `position:relative;${imgOpts.aspectRatio ? `aspect-ratio:${imgOpts.aspectRatio};` : ""}`;
        card.insertBefore(imgWrap, card.firstChild);
        break;
    }

    imgWrap.appendChild(img);
    imageEl = img;
  }

  function buildHeader(hdr: CardHeaderOptions): void {
    headerEl = document.createElement("div");
    headerEl.className = "card-header";
    headerEl.style.cssText = `padding:${pad};padding-bottom:calc(${pad} - 4px);`;

    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;";

    const left = document.createElement("div");
    left.style.cssText = "display:flex;align-items:center;gap:10px;min-width:0;flex:1;";

    // Avatar
    if (hdr.avatar) {
      const avatarEl = typeof hdr.avatar === "string"
        ? (() => { const el = document.createElement("img"); el.src = hdr.avatar; el.style.cssText = "width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;"; return el; })()
        : hdr.avatar as HTMLElement;
      avatarEl.style.flexShrink = "0";
      left.appendChild(avatarEl);
    }

    // Title + subtitle
    const textArea = document.createElement("div");
    textArea.style.cssText = "min-width:0;";
    if (hdr.title) {
      const title = document.createElement("h3");
      title.className = "card-title";
      title.style.cssText = "font-size:15px;font-weight:600;color:#111827;margin:0;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      title.textContent = hdr.title;
      textArea.appendChild(title);
    }
    if (hdr.subtitle) {
      const sub = document.createElement("p");
      sub.className = "card-subtitle";
      sub.style.cssText = "font-size:12px;color:#6b7280;margin:2px 0 0;line-height:1.3;";
      sub.textContent = hdr.subtitle;
      textArea.appendChild(sub);
    }
    left.appendChild(textArea);
    row.appendChild(left);

    // Actions
    if (hdr.actions) {
      const actionsEl = Array.isArray(hdr.actions)
        ? (() => { const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;gap:4px;flex-shrink:0;"; hdr.actions.forEach(a => wrap.appendChild(a)); return wrap; })()
        : hdr.actions as HTMLElement;
      row.appendChild(actionsEl);
    }

    headerEl.appendChild(row);

    // Divider
    if (hdr.divided) {
      const div = document.createElement("div");
      div.style.cssText = "height:1px;background:#f0f0f0;margin-top:calc(${pad} - 4px);";
      headerEl.appendChild(div);
    }

    // Insert after image if present, otherwise at start
    if (imageEl?.parentElement === card) {
      imageEl.parentElement!.insertBefore(headerEl, imageEl.nextSibling);
    } else {
      card.appendChild(headerEl);
    }
  }

  function buildBody(content: string | HTMLElement): void {
    bodyEl = document.createElement("div");
    bodyEl.className = "card-body";
    bodyEl.style.cssText = `padding:${pad};`;
    if (typeof content === "string") {
      bodyEl.textContent = content;
    } else {
      bodyEl.appendChild(content);
    }
    card.appendChild(bodyEl);
  }

  function buildFooter(content: string | HTMLElement): void {
    footerEl = document.createElement("div");
    footerEl.className = "card-footer";
    footerEl.style.cssText = `padding:${pad};padding-top:calc(${pad} - 4px);border-top:1px solid #f0f0f0;`;
    if (typeof content === "string") {
      footerEl.textContent = content;
    } else {
      footerEl.appendChild(content);
    }
    card.appendChild(footerEl);
  }

  return {
    element: card,

    setBody(content: string | HTMLElement) {
      if (bodyEl) {
        bodyEl.innerHTML = "";
        if (typeof content === "string") bodyEl.textContent = content;
        else bodyEl.appendChild(content);
      } else {
        buildBody(content);
      }
    },

    setHeader(header: Partial<CardHeaderOptions>) {
      if (headerEl) { headerEl.remove(); headerEl = null; }
      if (Object.keys(header).length > 0) buildHeader({ ...opts.header!, ...header });
    },

    setFooter(content: string | HTMLElement) {
      if (footerEl) { footerEl.remove(); footerEl = null; }
      buildFooter(content);
    },

    setImage(image: CardImageOptions) {
      if (imageEl?.parentElement) imageEl.parentElement.remove();
      buildImage(image);
    },

    destroy() { card.remove(); },
  };
}
