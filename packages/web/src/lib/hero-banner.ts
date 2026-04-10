/**
 * Hero Banner: Full-width hero section with headline, subheadline, CTA buttons,
 * background image/gradient, overlay, multiple layout variants, and responsive design.
 */

// --- Types ---

export type HeroLayout = "centered" | "left-aligned" | "split" | "overlay" | "minimal";
export type HeroSize = "sm" | "md" | "lg" | "xl" | "full";

export interface HeroButton {
  label: string;
  /** URL or onClick */
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  icon?: string;
}

export interface HeroBannerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Main headline (supports HTML) */
  headline: string;
  /** Subtitle/description */
  subtitle?: string;
  /** CTA buttons */
  buttons?: HeroButton[];
  /** Background options */
  background?: {
    /** CSS color, gradient, or image URL */
    value: string;
    type?: "color" | "gradient" | "image";
    /** Overlay opacity for images (0-1) */
    overlayOpacity?: number;
    /** Background position/size (for images) */
    bgPosition?: string;
    bgSize?: string;
  };
  /** Layout variant */
  layout?: HeroLayout;
  /** Size variant */
  size?: HeroSize;
  /** Text alignment */
  textAlign?: "left" | "center";
  /** Text color override */
  textColor?: string;
  /** Subtitle text color */
  subtitleColor?: string;
  /** Badge text above headline */
  badge?: string;
  /** Badge background color */
  badgeBg?: string;
  /** Custom element below content (e.g., illustration, screenshot) */
  illustration?: string; // HTML string or image URL
  /** Max width of content area */
  maxWidth?: string;
  /** Padding */
  padding?: string;
  /** Show subtle animated gradient border? */
  animatedBorder?: boolean;
  /** Callback when hero is visible (IntersectionObserver) */
  onVisible?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface HeroBannerInstance {
  element: HTMLElement;
  updateHeadline: (text: string) => void;
  updateSubtitle: (text: string) => void;
  setButtons: (buttons: HeroButton[]) => void;
  destroy: () => void;
}

// --- Size Config ---

const SIZE_STYLES: Record<HeroSize, { minHeight: string; padding: string; fontSize: { h1: string; sub: string } }> = {
  sm:   { minHeight: "300px", padding: "40px 20px", fontSize: { h1: "28px", sub: "15px" } },
  md:   { minHeight: "420px", padding: "60px 24px", fontSize: { h1: "36px", sub: "16px" } },
  lg:   { minHeight: "520px", padding: "80px 32px", fontSize: { h1: "48px", sub: "18px" } },
  xl:   { minHeight: "640px", padding: "100px 40px", fontSize: { h1: "56px", sub: "20px" } },
  full: { minHeight: "100vh", padding: "120px 48px", fontSize: { h1: "64px", sub: "22px" } },
};

// --- Main Factory ---

export function createHeroBanner(options: HeroBannerOptions): HeroBannerInstance {
  const opts = {
    layout: options.layout ?? "centered",
    size: options.size ?? "lg",
    textAlign: options.textAlign ?? "center",
    textColor: options.textColor ?? "#fff",
    subtitleColor: options.subtitleColor ?? "rgba(255,255,255,0.8)",
    maxWidth: options.maxWidth ?? "720px",
    padding: options.padding,
    animatedBorder: options.animatedBorder ?? false,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("HeroBanner: container not found");

  let destroyed = false;

  // Root
  const root = document.createElement("section");
  root.className = `hero-banner ${opts.className ?? ""}`;
  const sz = SIZE_STYLES[opts.size];

  // Build background style
  let bgStyle = "";
  if (opts.background) {
    switch (opts.background.type) {
      case "image":
        bgStyle = `background-image:url('${opts.background.value}');background-position:${opts.background.bgPosition ?? "center"};background-size:${opts.background.bgSize ?? "cover"};background-repeat:no-repeat;`;
        break;
      case "gradient":
        bgStyle = `background:${opts.background.value};`;
        break;
      default:
        bgStyle = `background:${opts.background.value};`;
        break;
    }
  } else {
    bgStyle = "background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);";
  }

  root.style.cssText = `
    position:relative;${bgStyle}
    min-height:${sz.minHeight};padding:${opts.padding ?? sz.padding};
    display:flex;align-items:center;justify-content:center;
    overflow:hidden;font-family:-apple-system,sans-serif;
  `;
  container.appendChild(root);

  // Image overlay
  if (opts.background?.type === "image" && opts.background.overlayOpacity !== undefined) {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position:absolute;inset:0;background:rgba(0,0,0,${opts.background.overlayOpacity});
      z-index:0;
    `;
    root.appendChild(overlay);
  }

  // Content wrapper
  const contentWrap = document.createElement("div");
  contentWrap.style.cssText = `
    position:relative;z-index:1;max-width:${opts.maxWidth};
    text-align:${opts.textAlign};width:100%;
  `;

  // Animated border glow
  if (opts.animatedBorder) {
    contentWrap.style.cssText += "border-radius:16px;padding:2px;";
    const glowEl = document.createElement("div");
    glowEl.style.cssText = `
      border-radius:14px;background:linear-gradient(90deg,#6366f1,#a855f7,#ec4899,#6366f1);
      background-size:200% 100%;animation:heroGlow 3s linear infinite;
      padding:1px;margin:-1px;
    `;
    if (!document.getElementById("hero-banner-styles")) {
      const s = document.createElement("style");
      s.id = "hero-banner-styles";
      s.textContent = "@keyframes heroGlow{0%{background-position:0% 50%}100%{background-position:200% 50%}}";
      document.head.appendChild(s);
    }
    const innerContent = document.createElement("div");
    innerContent.style.cssText = `border-radius:13px;background:${opts.background ? "transparent" : "rgba(255,255,255,0.05)"};backdrop-filter:blur(10px);padding:${sz.padding};`;
    glowEl.appendChild(innerContent);

    // Move content building into innerContent
    buildContent(innerContent);
    glowEl.appendChild(innerContent);
    contentWrap.appendChild(glowEl);
  } else {
    buildContent(contentWrap);
  }

  root.appendChild(contentWrap);

  function buildContent(target: HTMLElement): void {
    // Badge
    if (opts.badge) {
      const badge = document.createElement("div");
      badge.style.cssText = `
        display:inline-block;font-size:12px;font-weight:600;color:#111827;
        background:${opts.badgeBg ?? "#fde68a"};padding:4px 14px;border-radius:9999px;
        margin-bottom:16px;letter-spacing:0.5px;text-transform:uppercase;
      `;
      badge.textContent = opts.badge;
      target.appendChild(badge);
    }

    // Headline
    const h1 = document.createElement("h1");
    h1.className = "hero-headline";
    h1.innerHTML = opts.headline;
    h1.style.cssText = `
      font-size:${sz.fontSize.h1};font-weight:800;line-height:1.15;
      color:${opts.textColor};margin:0 0 16px;letter-spacing:-0.02em;
    `;
    target.appendChild(h1);

    // Subtitle
    if (opts.subtitle) {
      const sub = document.createElement("p");
      sub.className = "hero-subtitle";
      sub.textContent = opts.subtitle;
      sub.style.cssText = `
        font-size:${sz.fontSize.sub};line-height:1.7;color:${opts.subtitleColor};
        margin:0 0 28px;max-width:560px;${opts.textAlign === "center" ? "margin-left:auto;margin-right:auto;" : ""}
      `;
      target.appendChild(sub);
    }

    // CTA Buttons
    if (opts.buttons && opts.buttons.length > 0) {
      const btnGroup = document.createElement("div");
      btnGroup.className = "hero-buttons";
      btnGroup.style.cssText = `display:flex;gap:12px;flex-wrap:wrap;${opts.textAlign === "center" ? "justify-content:center;" : ""}`;

      for (const btn of opts.buttons) {
        const el = document.createElement(btn.href ? "a" : "button");
        if (btn.href) (el as HTMLAnchorElement).href = btn.href;

        const variant = btn.variant ?? "primary";
        el.style.cssText = getButtonStyle(variant);

        if (btn.icon) {
          const ic = document.createElement("span");
          ic.innerHTML = btn.icon;
          ic.style.cssText = "margin-right:6px;";
          el.appendChild(ic);
        }

        const lbl = document.createElement("span");
        lbl.textContent = btn.label;
        el.appendChild(lbl);

        if (!btn.href && btn.onClick) {
          el.addEventListener("click", btn.onClick);
        }

        btnGroup.appendChild(el);
      }

      target.appendChild(btnGroup);
    }

    // Illustration / image
    if (opts.illustration) {
      const ill = document.createElement("div");
      ill.className = "hero-illustration";
      ill.style.cssText = `margin-top:36px;${opts.textAlign === "center" ? "" : ""}`;

      if (opts.illustration.startsWith("<") || opts.illustration.includes("<")) {
        ill.innerHTML = opts.illustration;
      } else {
        // Treat as image URL
        const img = document.createElement("img");
        img.src = opts.illustration;
        img.alt = "";
        img.style.cssText = "max-width:100%;height:auto;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.15);";
        ill.appendChild(img);
      }

      target.appendChild(ill);
    }
  }

  function getButtonStyle(variant: string): string {
    switch (variant) {
      case "primary":
        return "display:inline-flex;align-items:center;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:600;background:#fff;color:#111827;border:none;cursor:pointer;text-decoration:none;transition:transform 0.15s,box-shadow 0.15s;font-family:inherit;box-shadow:0 4px 14px rgba(0,0,0,0.15);";
      case "secondary":
        return "display:inline-flex;align-items:center;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:600;background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);cursor:pointer;text-decoration:none;transition:all 0.15s;font-family:inherit;backdrop-filter:blur(4px);";
      case "outline":
        return "display:inline-flex;align-items:center;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:600;background:transparent;color:#fff;border:2px solid #fff;cursor:pointer;text-decoration:none;transition:all 0.15s;font-family:inherit;";
      case "ghost":
        return "display:inline-flex;align-items:center;padding:12px 20px;border-radius:10px;font-size:15px;font-weight:500;background:transparent;color:rgba(255,255,255,0.8);border:none;cursor:pointer;text-decoration:none;transition:color 0.15s;font-family:inherit;";
      default:
        return getButtonStyle("primary");
    }
  }

  // Intersection Observer for visibility callback
  if (opts.onVisible && !destroyed) {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) opts.onVisible?.(); },
      { threshold: 0.3 }
    );
    observer.observe(root);
  }

  const instance: HeroBannerInstance = {
    element: root,

    updateHeadline(text: string) {
      const h1 = root.querySelector(".hero-headline");
      if (h1) h1.innerHTML = text;
    },

    updateSubtitle(text: string) {
      const sub = root.querySelector(".hero-subtitle");
      if (sub) { sub.textContent = text; sub.style.display = text ? "" : "none"; }
    },

    setButtons(buttons: HeroButton[]) {
      opts.buttons = buttons;
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
