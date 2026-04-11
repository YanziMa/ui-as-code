/**
 * Hero Section: Full-width landing page hero with headline, subheadline,
 * CTA buttons (primary + secondary), background image/gradient/video,
 * overlay effects, badge/tag, and responsive layout.
 */

// --- Types ---

export type HeroLayout = "centered" | "left-aligned" | "split" | "overlay" | "minimal";
export type HeroHeight = "auto" | "full" | "screen" | "compact";

export interface HeroButton {
  /** Button text */
  label: string;
  /** Click handler or href */
  action?: () => void;
  href?: string;
  /** Variant: primary or secondary */
  variant?: "primary" | "secondary" | "ghost";
  /** Icon prefix */
  icon?: string;
}

export interface HeroOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Main headline text (supports HTML) */
  headline: string;
  /** Subheadline / description text */
  subheadline?: string;
  /** Primary CTA button */
  primaryAction?: HeroButton;
  /** Secondary CTA button */
  secondaryAction?: HeroButton;
  /** Badge/tag above headline */
  badge?: { text: string; variant?: "default" | "info" | "success" };
  /** Layout variant */
  layout?: HeroLayout;
  /** Height preset */
  height?: HeroHeight;
  /** Background image URL */
  backgroundImage?: string;
  /** Background gradient CSS */
  backgroundGradient?: string;
  /** Background video URL (mp4) */
  backgroundVideo?: string;
  /** Overlay color + opacity (e.g., "rgba(0,0,0,0.5)") */
  overlayColor?: string;
  /** Text alignment override */
  textAlign?: "left" | "center" | "right";
  /** Max content width (px) */
  maxWidth?: number;
  /** Custom top padding (px) */
  paddingTop?: number;
  /** Custom bottom padding (px) */
  paddingBottom?: number;
  /** Show decorative elements (circles, dots etc.) */
  decorations?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface HeroInstance {
  element: HTMLElement;
  setHeadline: (text: string) => void;
  setSubheadline: (text: string) => void;
  destroy: () => void;
}

// --- Config ---

const LAYOUT_STYLES: Record<HeroLayout, string> = {
  centered:   "justify-content:center;text-align:center;",
  "left-aligned": "justify-content:flex-start;text-align:left;",
  split:      "justify-content:space-between;align-items:center;",
  overlay:    "justify-content:flex-end;text-align:right;",
  minimal:    "justify-content:center;text-align:center;",
};

const HEIGHT_STYLES: Record<HeroHeight, string> = {
  auto:     "min-height:auto;padding-top:80px;padding-bottom:80px;",
  full:     "min-height:100vh;",
  screen:   "min-height:100vh;display:flex;align-items:center;",
  compact:  "padding-top:48px;padding-bottom:48px;",
};

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  default: { bg: "#eef2ff", color: "#4338ca" },
  info:    { bg: "#ecfeff", color: "#0891b2" },
  success: { bg: "#f0fdf4", color: "#16a34a" },
};

// --- Main Factory ---

export function createHeroSection(options: HeroOptions): HeroInstance {
  const opts = {
    layout: options.layout ?? "centered",
    height: options.height ?? "screen",
    overlayColor: options.overlayColor ?? "rgba(0,0,0,0)",
    textAlign: options.textAlign ?? (options.layout === "left-aligned" ? "left" : "center"),
    maxWidth: options.maxWidth ?? 720,
    paddingTop: options.paddingTop ?? 0,
    paddingBottom: options.paddingBottom ?? 0,
    decorations: options.decorations ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("HeroSection: container not found");

  let destroyed = false;

  // Root
  const root = document.createElement("section");
  root.className = `hero hero-${opts.layout} ${opts.className}`;
  root.style.cssText = `
    position:relative;width:100%;overflow:hidden;
    display:flex;flex-direction:column;
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;
    color:#fff;
  `;

  function render(): void {
    root.innerHTML = "";

    // Background layer
    if (opts.backgroundImage || opts.backgroundGradient || opts.backgroundVideo) {
      const bgLayer = document.createElement("div");
      bgLayer.className = "hero-bg";

      if (opts.backgroundImage) {
        bgLayer.style.cssText += `
          background-image:url(${opts.backgroundImage});
          background-size:cover;background-position:center;background-repeat:no-repeat;
        `;
      } else if (opts.backgroundGradient) {
        bgLayer.style.cssText += `background:${opts.backgroundGradient};`;
      }

      bgLayer.style.cssText += `
        position:absolute;inset:0;z-index:0;
      `;
      root.appendChild(bgLayer);

      // Video
      if (opts.backgroundVideo) {
        const video = document.createElement("video");
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.src = opts.backgroundVideo;
        video.style.cssText = `
          position:absolute;inset:0;width:100%;height:100%;
          object-fit:cover;z-index:-1;
        `;
        bgLayer.appendChild(video);
      }
    } else {
      // Default gradient
      root.style.background = "linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4338ca 100%)";
    }

    // Overlay
    if (opts.overlayColor && opts.overlayColor !== "rgba(0,0,0,0)") {
      const overlay = document.createElement("div");
      overlay.className = "hero-overlay";
      overlay.style.cssText = `
        position:absolute;inset:0;z-index:1;
        background:${opts.overlayColor};
      `;
      root.appendChild(overlay);
    }

    // Decorations
    if (opts.decorations) {
      renderDecorations();
    }

    // Content wrapper
    const contentWrap = document.createElement("div");
    contentWrap.className = "hero-content";
    contentWrap.style.cssText = `
      position:relative;z-index:2;
      max-width:${opts.maxWidth}px;margin:0 auto;
      width:100%;padding:0 24px;
      box-sizing:border-box;
      display:flex;flex-direction:column;
      gap:20px;${LAYOUT_STYLES[opts.layout]}
      ${HEIGHT_STYLES[opts.height]}
      ${opts.paddingTop ? `padding-top:${opts.paddingTop}px;` : ""}
      ${opts.paddingBottom ? `padding-bottom:${opts.paddingBottom}px;` : ""}
    `;

    // Badge
    if (opts.badge) {
      const badgeEl = document.createElement("span");
      badgeEl.className = "hero-badge";
      const colors = BADGE_COLORS[opts.badge.variant ?? "default"];
      badgeEl.style.cssText = `
        display:inline-flex;align-items:center;gap:6px;
        padding:6px 16px;border-radius:999px;font-size:13px;font-weight:500;
        background:${colors.bg};color:${colors.color};
        margin-bottom:8px;
      `;
      badgeEl.textContent = opts.badge.text;
      contentWrap.appendChild(badgeEl);
    }

    // Headline
    const headlineEl = document.createElement("h1");
    headlineEl.className = "hero-headline";
    headlineEl.innerHTML = opts.headline;
    headlineEl.style.cssText = `
      font-size:clamp(32px,5vw,56px);font-weight:800;line-height:1.1;
      letter-spacing:-0.02em;margin:0;
    `;
    contentWrap.appendChild(headlineEl);

    // Subheadline
    if (opts.subheadline) {
      const subEl = document.createElement("p");
      subEl.className = "hero-subheadline";
      subEl.textContent = opts.subheadline;
      subEl.style.cssText = `
        font-size:clamp(16px,2vw,20px);line-height:1.6;
        color:rgba(255,255,255,0.8);max-width:560px;margin:0;
        ${opts.textAlign === "center" ? "margin-left:auto;margin-right:auto;" : ""}
      `;
      contentWrap.appendChild(subEl);
    }

    // CTA buttons
    const btnRow = document.createElement("div");
    btnRow.className = "hero-actions";
    btnRow.style.cssText = `
      display:flex;gap:12px;flex-wrap:wrap;
      ${opts.textAlign === "center" ? "justify-content:center;" : ""}
      margin-top:8px;
    `;

    if (opts.primaryAction) {
      btnRow.appendChild(createCTA(opts.primaryAction, true));
    }
    if (opts.secondaryAction) {
      btnRow.appendChild(createCTA(opts.secondaryAction, false));
    }

    if (opts.primaryAction || opts.secondaryAction) {
      contentWrap.appendChild(btnRow);
    }

    root.appendChild(contentWrap);
  }

  function createCTA(btn: HeroButton, isPrimary: boolean): HTMLAnchorElement | HTMLButtonElement {
    const el = btn.href
      ? document.createElement("a")
      : document.createElement("button");

    el.type = "button";
    el.textContent = btn.label;

    const baseStyle = `
      display:inline-flex;align-items:center;gap:8px;
      padding:14px 28px;border-radius:10px;
      font-size:15px;font-weight:600;font-family:inherit;
      cursor:pointer;text-decoration:none;transition:all 0.2s ease;
      white-space:nowrap;
    `;

    if (isPrimary) {
      el.style.cssText = `${baseStyle}
        background:#fff;color:#1e1b4b;border:none;
        box-shadow:0 4px 14px rgba(255,255,255,0.25);
      `;
      el.addEventListener("mouseenter", () => { el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 24px rgba(255,255,255,0.3)"; });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; el.style.boxShadow = "0 4px 14px rgba(255,255,255,0.25)"; });
    } else {
      const variant = btn.variant ?? "secondary";
      if (variant === "ghost") {
        el.style.cssText = `${baseStyle}
          background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,0.35);
        `;
        el.addEventListener("mouseenter", () => { el.style.borderColor = "rgba(255,255,255,0.7)"; el.style.background = "rgba(255,255,255,0.08)"; });
        el.addEventListener("mouseleave", () => { el.style.borderColor = "rgba(255,255,255,0.35)"; el.style.background = "transparent"; });
      } else {
        el.style.cssText = `${baseStyle}
          background:rgba(255,255,255,0.12);color:#fff;
          border:1.5px solid rgba(255,255,255,0.2);
          backdrop-filter:blur(8px);
        `;
        el.addEventListener("mouseenter", () => { el.style.background = "rgba(255,255,255,0.2)"; el.style.borderColor = "rgba(255,255,255,0.35)"; });
        el.addEventListener("mouseleave", () => { el.style.background = "rgba(255,255,255,0.12)"; el.style.borderColor = "rgba(255,255,255,0.2)"; });
      }
    }

    if (btn.icon) {
      const iconSpan = document.createElement("span");
      iconSpan.textContent = btn.icon;
      iconSpan.style.fontSize = "18px";
      el.insertBefore(iconSpan, el.firstChild);
    }

    if (btn.href) {
      (el as HTMLAnchorElement).href = btn.href;
    } else if (btn.action) {
      el.addEventListener("click", () => btn.action!());
    }

    return el as HTMLAnchorElement | HTMLButtonElement;
  }

  function renderDecorations(): void {
    // Subtle floating circles
    const decorContainer = document.createElement("div");
    decorContainer.className = "hero-decorations";
    decorContainer.style.cssText = "position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden;";

    const circles = [
      { size: 300, x: "10%", y: "20%", opacity: 0.06 },
      { size: 200, x: "75%", y: "60%", opacity: 0.04 },
      { size: 150, x: "50%", y: "80%", opacity: 0.05 },
    ];

    for (const c of circles) {
      const circle = document.createElement("div");
      circle.style.cssText = `
        position:absolute;left:${c.x};top:${c.y};
        width:${c.size}px;height:${c.size}px;border-radius:50%;
        background:rgba(255,255,255,${c.opacity});
        filter:blur(40px);
      `;
      decorContainer.appendChild(circle);
    }

    // Dot grid pattern
    const dotGrid = document.createElement("div");
    dotGrid.style.cssText = `
      position:absolute;inset:0;
      background-image:radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px);
      background-size:30px 30px;
    `;
    decorContainer.appendChild(dotGrid);

    root.appendChild(decorContainer);
  }

  // Initial render
  render();

  const instance: HeroInstance = {
    element: root,

    setHeadline(text: string) {
      opts.headline = text;
      const hl = root.querySelector(".hero-headline");
      if (hl) hl.innerHTML = text;
    },

    setSubheadline(text: string) {
      opts.subheadline = text;
      const sub = root.querySelector(".hero-subheadline");
      if (sub) sub.textContent = text;
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
