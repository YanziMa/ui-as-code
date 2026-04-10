/**
 * Empty State Component: Placeholder for empty data states with
 * illustration area, description text, action buttons, multiple layout
 * variants, image support, and customizable styling.
 */

// --- Types ---

export type EmptySize = "sm" | "md" | "lg";
export type EmptyVariant = "default" | "minimal" | "illustrated" | "card";

export interface EmptyOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Main description text */
  description?: string;
  /** Title/heading text */
  title?: string;
  /** Illustration (emoji, SVG string, or image URL) */
  image?: string;
  /** Image size in px (default: auto by variant) */
  imageSize?: number;
  /** Primary action button */
  primaryAction?: { text: string; onClick: () => void };
  /** Secondary action button */
  secondaryAction?: { text: string; onClick: () => void };
  /** Size variant */
  size?: EmptySize;
  /** Layout variant */
  variant?: EmptyVariant;
  /** Center content horizontally and vertically */
  centered?: boolean;
  /** Maximum width of the content area */
  maxWidth?: number;
  /** Custom background color (for card variant) */
  backgroundColor?: string;
  /** Custom CSS class */
  className?: string;
}

export interface EmptyInstance {
  element: HTMLElement;
  setTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  setImage: (image: string) => void;
  destroy: () => void;
}

// --- Size Config ---

const SIZE_STYLES: Record<EmptySize, {
  imageMaxHeight: number;
  titleFontSize: number;
  descFontSize: number;
  padding: string;
}> = {
  sm: { imageMaxHeight: 80, titleFontSize: 14, descFontSize: 12, padding: "24px 16px" },
  md: { imageMaxHeight: 120, titleFontSize: 16, descFontSize: 13, padding: "32px 24px" },
  lg: { imageMaxHeight: 160, titleFontSize: 18, descFontSize: 14, padding: "48px 32px" },
};

// --- Default Illustrations ---

const DEFAULT_ILLUSTRATIONS: Record<string, string> = {
  default: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="30" y="20" width="100" height="70" rx="8" stroke="#d1d5db" stroke-width="2" fill="#f9fafb"/>
    <line x1="50" y1="45" x2="110" y2="45" stroke="#e5e7eb" stroke-width="2" stroke-linecap="round"/>
    <line x1="65" y1="58" x2="95" y2="58" stroke="#e5e7eb" stroke-width="2" stroke-linecap="round"/>
    <circle cx="80" cy="72" r="10" stroke="#d1d5db" stroke-width="1.5" fill="none"/>
    <path d="M76 72l3 3 6-6" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  search: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="68" cy="52" r="28" stroke="#d1d5db" stroke-width="2.5" fill="#f9fafb"/>
    <line x1="89" y1="73" x2="110" y2="94" stroke="#d1d5db" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,
  list: `<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="35" y="15" width="90" height="12" rx="3" fill="#f3f4f6"/>
    <rect x="35" y="38" width="70" height="10" rx="3" fill="#f3f4f6"/>
    <rect x="35" y="56" width="80" height="10" rx="3" fill="#f3f4f6"/>
    <rect x="35" y="74" width="55" height="10" rx="3" fill="#f3f4f6"/>
    <rect x="35" y="92" width="65" height="10" rx="3" fill="#f3f4f6"/>
  </svg>`,
};

// --- Main ---

export function createEmpty(options: EmptyOptions): EmptyInstance {
  const opts = {
    size: options.size ?? "md",
    variant: options.variant ?? "default",
    centered: options.centered ?? true,
    maxWidth: options.maxWidth ?? 400,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Empty: container not found");

  const sz = SIZE_STYLES[opts.size];
  let destroyed = false;

  function render(): void {
    container.innerHTML = "";
    container.className = `empty empty-${opts.variant} empty-${opts.size} ${opts.className}`;

    switch (opts.variant) {
      case "card":
        renderCard();
        break;
      case "minimal":
        renderMinimal();
        break;
      case "illustrated":
        renderIllustrated();
        break;
      default:
        renderDefault();
    }
  }

  function renderDefault(): void {
    container.style.cssText = `
      display:flex;flex-direction:column;align-items:center;
      justify-content:${opts.centered ? "center" : "flex-start"};
      gap:12px;padding:${sz.padding};
      font-family:-apple-system,sans-serif;color:#6b7280;
      max-width:${opts.maxWidth}px;${opts.centered ? "margin:0 auto;" : ""}
    `;

    // Image / illustration
    if (opts.image) {
      const imgEl = createImageEl(opts.image);
      container.appendChild(imgEl);
    } else {
      // Default illustration
      const defImg = document.createElement("div");
      defImg.className = "empty-image";
      defImg.innerHTML = DEFAULT_ILLUSTRATIONS.default;
      defImg.style.cssText = `
        max-height:${sz.imageMaxHeight}px;width:auto;opacity:0.7;
        margin-bottom:4px;
      `;
      container.appendChild(defImg);
    }

    // Title
    if (opts.title) {
      const titleEl = document.createElement("h3");
      titleEl.style.cssText = `margin:0;font-size:${sz.titleFontSize}px;font-weight:600;color:#374151;line-height:1.4;`;
      titleEl.textContent = opts.title;
      container.appendChild(titleEl);
    }

    // Description
    if (opts.description) {
      const descEl = document.createElement("p");
      descEl.style.cssText = `margin:0;font-size:${sz.descFontSize}px;color:#9ca3af;line-height:1.6;text-align:center;max-width:320px;`;
      descEl.textContent = opts.description;
      container.appendChild(descEl);
    }

    // Actions
    renderActions(container);
  }

  function renderCard(): void {
    container.style.cssText = `
      background:${opts.backgroundColor ?? "#fff"};border:1px solid #e5e7eb;
      border-radius:12px;padding:${sz.padding};display:flex;flex-direction:column;
      align-items:center;gap:14px;max-width:${opts.maxWidth}px;
      box-shadow:0 1px 3px rgba(0,0,0,0.04);
      ${opts.centered ? "margin:0 auto;" : ""}
    `;

    // Image
    if (opts.image) {
      const imgEl = createImageEl(opts.image);
      imgEl.style.marginBottom = "4px";
      container.appendChild(imgEl);
    } else {
      const defImg = document.createElement("div");
      defImg.className = "empty-image";
      defImg.innerHTML = DEFAULT_ILLUSTRATIONS.default;
      defImg.style.cssText = `max-height:${sz.imageMaxHeight}px;width:auto;opacity:0.6;`;
      container.appendChild(defImg);
    }

    // Title
    if (opts.title) {
      const titleEl = document.createElement("h3");
      titleEl.style.cssText = `margin:0;font-size:${sz.titleFontSize}px;font-weight:600;color:#111827;line-height:1.4;`;
      titleEl.textContent = opts.title;
      container.appendChild(titleEl);
    }

    // Description
    if (opts.description) {
      const descEl = document.createElement("p");
      descEl.style.cssText = `margin:0;font-size:${sz.descFontSize}px;color:#6b7280;line-height:1.6;text-align:center;`;
      descEl.textContent = opts.description;
      container.appendChild(descEl);
    }

    renderActions(container);
  }

  function renderMinimal(): void {
    container.style.cssText = `
      display:flex;flex-direction:column;align-items:center;
      justify-content:${opts.centered ? "center" : "flex-start"};
      gap:6px;padding:16px;font-family:-apple-system,sans-serif;color:#9ca3af;
    `;

    // Small icon or emoji
    if (opts.image) {
      const iconWrap = document.createElement("span");
      iconWrap.style.cssText = `font-size:28px;line-height:1;`;
      if (/^https?:\/|^data:image/.test(opts.image)) {
        const img = document.createElement("img");
        img.src = opts.image;
        img.style.cssText = `width:32px;height:32px;object-fit:contain;`;
        iconWrap.appendChild(img);
      } else {
        iconWrap.textContent = opts.image;
      }
      container.appendChild(iconWrap);
    }

    // Description only (no separate title for minimal)
    const text = opts.title && opts.description
      ? `${opts.title}: ${opts.description}`
      : opts.title ?? opts.description ?? "No data";

    const descEl = document.createElement("span");
    descEl.style.cssText = `font-size:${sz.descFontSize}px;line-height:1.4;`;
    descEl.textContent = text;
    container.appendChild(descEl);

    renderActions(container);
  }

  function renderIllustrated(): void {
    container.style.cssText = `
      display:flex;flex-direction:column;align-items:center;
      justify-content:${opts.centered ? "center" : "flex-start"};
      gap:16px;padding:${sz.padding};
      font-family:-apple-system,sans-serif;
      max-width:${opts.maxWidth + 60}px;
      ${opts.centered ? "margin:0 auto;" : ""}
    `;

    // Large illustration area
    const illusArea = document.createElement("div");
    illusArea.className = "empty-illustration";
    illusArea.style.cssText = `
      width:100%;max-width:240px;height:auto;display:flex;align-items:center;
      justify-content:center;margin-bottom:4px;
    `;

    if (opts.image) {
      if (/^https?:\/|^data:image/.test(opts.image)) {
        const img = document.createElement("img");
        img.src = opts.image;
        img.alt = opts.title ?? "Empty state";
        img.style.cssText = `max-width:100%;max-height:${(opts.imageSize ?? sz.imageMaxHeight * 1.5)}px;object-fit:contain;`;
        illusArea.appendChild(img);
      } else {
        illusArea.innerHTML = opts.image;
        illusArea.style.fontSize = `${Math.min(opts.imageSize ?? sz.imageMaxHeight * 1.5, 120)}px`;
      }
    } else {
      illusArea.innerHTML = DEFAULT_ILLUSTRATIONS.default;
    }
    container.appendChild(illusArea);

    // Title
    if (opts.title) {
      const titleEl = document.createElement("h3");
      titleEl.style.cssText = `margin:0;font-size:${sz.titleFontSize + 2}px;font-weight:600;color:#111827;line-height:1.3;text-align:center;`;
      titleEl.textContent = opts.title;
      container.appendChild(titleEl);
    }

    // Description
    if (opts.description) {
      const descEl = document.createElement("p");
      descEl.style.cssText = `margin:0;font-size:${sz.descFontSize}px;color:#6b7280;line-height:1.6;text-align:center;max-width:340px;`;
      descEl.textContent = opts.description;
      container.appendChild(descEl);
    }

    renderActions(container);
  }

  function createImageEl(src: string): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "empty-image";

    if (/^https?:\/|^data:image/.test(src)) {
      const img = document.createElement("img");
      img.src = src;
      img.alt = opts.title ?? "Empty state";
      img.style.cssText = `max-height:${opts.imageSize ?? sz.imageMaxHeight}px;width:auto;object-fit:contain;`;
      wrap.appendChild(img);
    } else {
      // SVG string or emoji
      if (src.startsWith("<")) {
        wrap.innerHTML = src;
        wrap.querySelector("svg")!.style.cssText = `max-height:${opts.imageSize ?? sz.imageMaxHeight}px;width:auto;`;
      } else {
        wrap.textContent = src;
        wrap.style.cssText = `font-size:${opts.imageSize ?? sz.imageMaxHeight}px;line-height:1;`;
      }
    }

    return wrap;
  }

  function renderActions(parent: HTMLElement): void {
    if (!opts.primaryAction && !opts.secondaryAction) return;

    const actionsRow = document.createElement("div");
    actionsRow.style.cssText = "display:flex;gap:8px;margin-top:4px;";

    if (opts.primaryAction) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = opts.primaryAction.text;
      btn.style.cssText = `
        background:#4338ca;color:#fff;border:none;padding:8px 20px;border-radius:6px;
        font-size:${sz.descFontSize}px;font-weight:500;cursor:pointer;
        transition:background 0.15s,transform 0.1s;
      `;
      btn.addEventListener("click", (e) => { e.stopPropagation(); opts.primaryAction!.onClick(); });
      btn.addEventListener("mouseenter", () => { btn.style.background = "#3730a3"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = "#4338ca"; });
      actionsRow.appendChild(btn);
    }

    if (opts.secondaryAction) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = opts.secondaryAction.text;
      btn.style.cssText = `
        background:transparent;color:#4338ca;border:1px solid #c7d2fe;
        padding:8px 20px;border-radius:6px;font-size:${sz.descFontSize}px;
        font-weight:500;cursor:pointer;transition:all 0.15s;
      `;
      btn.addEventListener("click", (e) => { e.stopPropagation(); opts.secondaryAction!.onClick(); });
      btn.addEventListener("mouseenter", () => { btn.style.background = "#eef2ff"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = "transparent"; });
      actionsRow.appendChild(btn);
    }

    parent.appendChild(actionsRow);
  }

  // Initial render
  render();

  return {
    element: container,

    setTitle(title: string) {
      opts.title = title;
      render();
    },

    setDescription(description: string) {
      opts.description = description;
      render();
    },

    setImage(image: string) {
      opts.image = image;
      render();
    },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };
}
