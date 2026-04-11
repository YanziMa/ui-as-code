/**
 * Skeleton Screen: Page-level skeleton loading screens with layout templates
 * (dashboard, article, profile, table, list), section-based rendering,
 * progressive reveal animations, and responsive breakpoints.
 */

// --- Types ---

export type ScreenTemplate =
  | "dashboard"
  | "article"
  | "profile"
  | "table"
  | "list"
  | "detail"
  | "settings"
  | "custom";

export type RevealMode = "sequential" | "simultaneous" | "top-down";

export interface SkeletonSection {
  /** Section identifier */
  id: string;
  /** Section type */
  type: "header" | "sidebar" | "content" | "footer" | "custom";
  /** Width ratio (flex) */
  width?: string;
  /** Height or min-height */
  height?: string;
  /** Custom items within this section */
  items?: SkeletonBlock[];
  /** Show this section? */
  visible?: boolean;
}

export interface SkeletonBlock {
  /** Block shape */
  shape: "line" | "rect" | "circle" | "avatar" | "image" | "button" | "chip";
  /** Width (px, %, or fraction) */
  width: string;
  /** Height (px) */
  height: string;
  /** Border radius */
  borderRadius?: string;
  /** Margin bottom */
  marginBottom?: string;
  /** Delay index for sequential reveal */
  delayIndex?: number;
}

export interface SkeletonScreenOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Layout template to use */
  template?: ScreenTemplate;
  /** Custom sections (overrides template) */
  sections?: SkeletonSection[];
  /** Base color */
  baseColor?: string;
  /** Highlight color for shimmer */
  highlightColor?: string;
  /** Shimmer animation speed (ms) */
  speed?: number;
  /** Animation type */
  animation?: "shimmer" | "pulse" | "none";
  /** Reveal mode when hiding */
  revealMode?: RevealMode;
  /** Stagger delay between sections (ms) */
  staggerDelay?: number;
  /** Border radius default */
  borderRadius?: number;
  /** Padding around content */
  padding?: number;
  /** Callback when shown */
  onShow?: () => void;
  /** Callback when hidden (reveal complete) */
  onHide?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface SkeletonScreenInstance {
  element: HTMLElement;
  /** Show the skeleton screen */
  show: () => void;
  /** Hide with reveal animation */
  hide: () => void;
  /** Immediately remove without animation */
  destroy: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Update sections dynamically */
  setSections: (sections: SkeletonSection[]) => void;
  /** Change template */
  setTemplate: (template: ScreenTemplate) => void;
}

// --- Template Definitions ---

function getTemplateSections(template: ScreenTemplate): SkeletonSection[] {
  switch (template) {
    case "dashboard":
      return [
        { id: "header", type: "header", width: "100%", height: "60px", visible: true },
        {
          id: "body", type: "content", width: "100%", items: [
            { shape: "rect", width: "100%", height: "200px", borderRadius: "12px", marginBottom: "20px" },
            { shape: "line", width: "40%", height: "24px", borderRadius: "6px", marginBottom: "16px" },
            { shape: "line", width: "100%", height: "14px", marginBottom: "10px" },
            { shape: "line", width: "85%", height: "14px", marginBottom: "10px" },
            { shape: "line", width: "70%", height: "14px", marginBottom: "24px" },
            { shape: "rect", width: "48%", height: "160px", borderRadius: "12px", marginBottom: "16px", delayIndex: 0 },
            { shape: "rect", width: "48%", height: "160px", borderRadius: "12px", marginBottom: "0", delayIndex: 1 },
          ],
        },
      ];

    case "article":
      return [
        { id: "header", type: "header", width: "100%", height: "40px", items: [
          { shape: "line", width: "30%", height: "20px", borderRadius: "6px", marginBottom: "0" },
        ]},
        {
          id: "body", type: "content", width: "100%", items: [
            { shape: "circle", width: "48px", height: "48px", marginBottom: "16px" },
            { shape: "line", width: "25%", height: "18px", borderRadius: "4px", marginBottom: "8px" },
            { shape: "line", width: "15%", height: "14px", borderRadius: "4px", marginBottom: "24px" },
            { shape: "image", width: "100%", height: "300px", borderRadius: "12px", marginBottom: "24px" },
            { shape: "line", width: "100%", height: "14px", marginBottom: "10px" },
            { shape: "line", width: "100%", height: "14px", marginBottom: "10px" },
            { shape: "line", width: "90%", height: "14px", marginBottom: "10px" },
            { shape: "line", width: "95%", height: "14px", marginBottom: "10px" },
            { shape: "line", width: "75%", height: "14px", marginBottom: "0" },
          ],
        },
      ];

    case "profile":
      return [
        { id: "header", type: "header", width: "100%", height: "200px", items: [] },
        {
          id: "body", type: "content", width: "100%", items: [
            { shape: "avatar", width: "96px", height: "96px", marginBottom: "16px" },
            { shape: "line", width: "35%", height: "22px", borderRadius: "6px", marginBottom: "8px" },
            { shape: "line", width: "25%", height: "14px", borderRadius: "4px", marginBottom: "32px" },
            { shape: "button", width: "120px", height: "36px", borderRadius: "8px", marginBottom: "24px" },
            { shape: "line", width: "20%", height: "16px", borderRadius: "4px", marginBottom: "16px" },
            { shape: "line", width: "100%", height: "40px", borderRadius: "8px", marginBottom: "10px" },
            { shape: "line", width: "100%", height: "40px", borderRadius: "8px", marginBottom: "10px" },
            { shape: "line", width: "100%", height: "40px", borderRadius: "8px", marginBottom: "0" },
          ],
        },
      ];

    case "table":
      return [
        { id: "header", type: "header", width: "100%", height: "56px", items: [
          { shape: "rect", width: "200px", height: "32px", borderRadius: "6px", marginBottom: "0" },
        ]},
        {
          id: "body", type: "content", width: "100%", items: [
            ...Array.from({ length: 5 }, (_, i) => [
              { shape: "rect", width: "20px", height: "20px", borderRadius: "4px", marginBottom: "0", delayIndex: i * 3 },
              { shape: "line", width: "25%", height: "14px", borderRadius: "4px", marginBottom: "0", delayIndex: i * 3 + 1 },
              { shape: "line", width: "20%", height: "14px", borderRadius: "4px", marginBottom: "0", delayIndex: i * 3 + 2 },
              { shape: "line", width: "15%", height: "14px", borderRadius: "4px", marginBottom: "0", delayIndex: i * 3 + 2 },
              { shape: "chip", width: "60px", height: "24px", borderRadius: "12px", marginBottom: "0", delayIndex: i * 3 + 2 },
            ]).flat(),
          ],
        },
      ];

    case "list":
      return [
        { id: "header", type: "header", width: "100%", height: "52px", items: [
          { shape: "line", width: "30%", height: "20px", borderRadius: "6px", marginBottom: "0" },
        ]},
        {
          id: "body", type: "content", width: "100%", items: [
            ...Array.from({ length: 6 }, (_, i) => [
              { shape: "avatar", width: "44px", height: "44px", marginBottom: "0", delayIndex: i * 2 },
              { shape: "line", width: "45%", height: "16px", borderRadius: "4px", marginBottom: "4px", delayIndex: i * 2 },
              { shape: "line", width: "65%", height: "13px", borderRadius: "4px", marginBottom: "0", delayIndex: i * 2 + 1 },
            ]).flat(),
          ],
        },
      ];

    case "detail":
      return [
        { id: "header", type: "header", width: "100%", height: "48px", items: [
          { shape: "line", width: "15%", height: "18px", borderRadius: "4px", marginBottom: "0" },
        ]},
        {
          id: "main", type: "content", width: "65%", items: [
            { shape: "image", width: "100%", height: "240px", borderRadius: "12px", marginBottom: "20px" },
            { shape: "line", width: "50%", height: "24px", borderRadius: "6px", marginBottom: "12px" },
            { shape: "line", width: "100%", height: "14px", marginBottom: "8px" },
            { shape: "line", width: "92%", height: "14px", marginBottom: "8px" },
            { shape: "line", width: "78%", height: "14px", marginBottom: "0" },
          ],
        },
        {
          id: "sidebar", type: "sidebar", width: "30%", items: [
            { shape: "rect", width: "100%", height: "180px", borderRadius: "12px", marginBottom: "16px" },
            { shape: "line", width: "70%", height: "18px", borderRadius: "6px", marginBottom: "12px" },
            { shape: "line", width: "100%", height: "36px", borderRadius: "8px", marginBottom: "8px" },
            { shape: "line", width: "100%", height: "36px", borderRadius: "8px", marginBottom: "8px" },
            { shape: "line", width: "80%", height: "36px", borderRadius: "8px", marginBottom: "0" },
          ],
        },
      ];

    case "settings":
      return [
        { id: "header", type: "header", width: "100%", height: "56px", items: [
          { shape: "line", width: "20%", height: "22px", borderRadius: "6px", marginBottom: "0" },
        ]},
        {
          id: "nav", type: "sidebar", width: "220px", items: [
            ...Array.from({ length: 7 }, (_, i) => ({
              shape: "line" as const,
              width: `${85 - i * 8}%`,
              height: "14px",
              borderRadius: "4px",
              marginBottom: i < 6 ? "16px" : "0",
              delayIndex: i,
            })),
          ],
        },
        {
          id: "content", type: "content", width: "", items: [
            { shape: "line", width: "35%", height: "22px", borderRadius: "6px", marginBottom: "24px" },
            ...Array.from({ length: 5 }, (_, i) => [
              { shape: "line", width: "25%", height: "15px", borderRadius: "4px", marginBottom: "8px", delayIndex: i * 2 },
              { shape: "line", width: "100%", height: "44px", borderRadius: "8px", marginBottom: "20px", delayIndex: i * 2 + 1 },
            ]).flat(),
          ],
        },
      ];

    default:
      return [
        { id: "default", type: "content", width: "100%", items: [
          { shape: "rect", width: "100%", height: "200px", borderRadius: "12px", marginBottom: "20px" },
          { shape: "line", width: "50%", height: "20px", borderRadius: "6px", marginBottom: "16px" },
          { shape: "line", width: "100%", height: "14px", marginBottom: "10px" },
          { shape: "line", width: "90%", height: "14px", marginBottom: "0" },
        ]},
      ];
  }
}

// --- Shimmer Style Injection ---

let screenStylesInjected = false;

function injectScreenStyles(): void {
  if (screenStylesInjected) return;
  const style = document.createElement("style");
  style.id = "skeleton-screen-styles";
  style.textContent = `
    @keyframes sks-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes sks-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.45; }
    }
    @keyframes sks-fade-out {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-8px); }
    }
    @keyframes sks-reveal-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
  screenStylesInjected = true;
}

// --- Block Renderer ---

function renderBlock(
  block: SkeletonBlock,
  opts: Pick<SkeletonScreenOptions, "baseColor" | "highlightColor" | "speed" | "animation" | "borderRadius">,
): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `sks-block sks-${block.shape}`;

  const br = block.borderRadius ?? `${opts.borderRadius ?? 4}px`;
  const isCircle = block.shape === "circle" || block.shape === "avatar";

  let cssText = `
    display:inline-block;background:${opts.baseColor ?? "#f3f4f6"};
    width:${block.width};height:${block.height};
    border-radius:${isCircle ? "50%" : br};
    flex-shrink:0;
    ${block.marginBottom ? `margin-bottom:${block.marginBottom};` : ""}
  `;

  if (opts.animation === "shimmer") {
    cssText += `
      background-image:linear-gradient(90deg,${opts.baseColor ?? "#f3f4f6"} 0%,${opts.highlightColor ?? "#e5e7eb"} 50%,${opts.baseColor ?? "#f3f4f6"} 100%);
      background-size:200% 100%;animation:sks-shimmer ${opts.speed ?? 1500}ms infinite linear;
    `;
  } else if (opts.animation === "pulse") {
    cssText += `animation:sks-pulse ${(opts.speed ?? 1500) * 0.8}ms infinite ease-in-out;`;
  }

  el.style.cssText = cssText;
  return el;
}

// --- Main Factory ---

export function createSkeletonScreen(options: SkeletonScreenOptions): SkeletonScreenInstance {
  injectScreenStyles();

  const opts = {
    baseColor: options.baseColor ?? "#f3f4f6",
    highlightColor: options.highlightColor ?? "#e5e7eb",
    speed: options.speed ?? 1500,
    animation: options.animation ?? "shimmer",
    revealMode: options.revealMode ?? "simultaneous",
    staggerDelay: options.staggerDelay ?? 80,
    borderRadius: options.borderRadius ?? 4,
    padding: options.padding ?? 0,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("SkeletonScreen: container not found");

  let visible = false;
  let destroyed = false;
  let currentTemplate = options.template ?? "dashboard";
  let currentSections = options.sections ?? getTemplateSections(currentTemplate);

  // Overlay wrapper
  const overlay = document.createElement("div");
  overlay.className = `skeleton-screen ${opts.className}`;
  overlay.style.cssText = `
    position:absolute;top:0;left:0;right:0;bottom:0;z-index:10;
    display:none;overflow:hidden;
    ${opts.padding > 0 ? `padding:${opts.padding}px;` : ""}
  `;
  container.style.position = container.style.position || "relative";
  container.appendChild(overlay);

  function render(): void {
    overlay.innerHTML = "";

    // Determine layout direction based on sections
    const hasSidebar = currentSections.some((s) => s.type === "sidebar");
    const hasHeader = currentSections.some((s) => s.type === "header");

    if (hasSidebar) {
      overlay.style.display = "flex";
      overlay.style.flexDirection = "column";
      overlay.style.gap = "0";
    } else {
      overlay.style.display = "flex";
      overlay.style.flexDirection = "column";
    }

    for (const section of currentSections) {
      if (section.visible === false) continue;

      const sectionEl = document.createElement("div");
      sectionEl.className = `sks-section sks-${section.type}`;
      sectionEl.dataset.sectionId = section.id;

      if (hasSidebar && section.type === "sidebar") {
        sectionEl.style.cssText = `
          flex-shrink:0;width:${section.width ?? "220px"};
          padding:16px;border-right:1px solid #f0f0f0;
          display:flex;flex-direction:column;gap:8px;
        `;
      } else if (hasSidebar && section.type === "content") {
        sectionEl.style.cssText = `
          flex:1;padding:16px 24px;display:flex;flex-direction:column;gap:8px;
        `;
      } else if (section.type === "header") {
        sectionEl.style.cssText = `
          width:100%;min-height:${section.height ?? "auto"};
          padding:12px 24px;border-bottom:1px solid #f0f0f0;
          display:flex;align-items:center;gap:12px;box-sizing:border-box;
        `;
      } else {
        sectionEl.style.cssText = `
          width:${section.width ?? "100%"};
          padding:16px 24px;display:flex;flex-direction:column;gap:8px;
          box-sizing:border-box;
        `;
      }

      // Render blocks in section
      if (section.items && section.items.length > 0) {
        for (const block of section.items) {
          const blockEl = renderBlock(block, opts);
          if (block.delayIndex !== undefined) {
            blockEl.dataset.delayIndex = String(block.delayIndex);
          }
          sectionEl.appendChild(blockEl);
        }
      }

      // If header with no items, add placeholder
      if (section.type === "header" && (!section.items || section.items.length === 0)) {
        const ph = document.createElement("div");
        ph.style.cssText = `width:180px;height:20px;border-radius:6px;background:${opts.baseColor};`;
        if (opts.animation === "shimmer") {
          ph.style.backgroundImage = `linear-gradient(90deg,${opts.baseColor} 0%,${opts.highlightColor} 50%,${opts.baseColor} 100%)`;
          ph.style.backgroundSize = "200% 100%";
          ph.style.animation = `sks-shimmer ${opts.speed}ms infinite linear`;
        }
        sectionEl.appendChild(ph);
      }

      overlay.appendChild(sectionEl);
    }
  }

  function animateHide(): void {
    const blocks = overlay.querySelectorAll<HTMLElement>(".sks-block");

    switch (opts.revealMode) {
      case "sequential": {
        // Staggered fade out per delay group
        const groups = new Map<number, HTMLElement[]>();
        blocks.forEach((b) => {
          const idx = parseInt(b.dataset.delayIndex ?? "0", 10);
          if (!groups.has(idx)) groups.set(idx, []);
          groups.get(idx)!.push(b);
        });

        let maxDelay = 0;
        groups.forEach((group, delayIdx) => {
          const delay = delayIdx * opts.staggerDelay;
          maxDelay = Math.max(maxDelay, delay + 300);
          group.forEach((el) => {
            el.style.transition = `opacity 0.3s ease, transform 0.3s ease`;
            el.style.transitionDelay = `${delay}ms`;
            el.style.opacity = "0";
            el.style.transform = "translateY(-6px)";
          });
        });

        setTimeout(() => {
          overlay.style.display = "none";
          visible = false;
          opts.onHide?.();
        }, maxDelay + 50);
        break;
      }

      case "top-down": {
        // Sections fade top to bottom
        const sections = overlay.querySelectorAll<HTMLElement>(".sks-section");
        sections.forEach((sec, i) => {
          sec.style.transition = "opacity 0.3s ease, transform 0.3s ease";
          sec.style.transitionDelay = `${i * opts.staggerDelay}ms`;
          sec.style.opacity = "0";
          sec.style.transform = "translateY(-8px)";
        });

        setTimeout(() => {
          overlay.style.display = "none";
          visible = false;
          opts.onHide?.();
        }, sections.length * opts.staggerDelay + 350);
        break;
      }

      default: {
        // simultaneous
        overlay.style.transition = "opacity 0.25s ease";
        overlay.style.opacity = "0";
        setTimeout(() => {
          overlay.style.display = "none";
          overlay.style.opacity = "";
          visible = false;
          opts.onHide?.();
        }, 260);
        break;
      }
    }
  }

  const instance: SkeletonScreenInstance = {
    element: overlay,

    show() {
      if (visible) return;
      visible = true;
      render();
      overlay.style.display = "";
      overlay.style.opacity = "0";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          overlay.style.transition = "opacity 0.2s ease";
          overlay.style.opacity = "1";
        });
      });
      opts.onShow?.();
    },

    hide() {
      if (!visible) return;
      animateHide();
    },

    isVisible: () => visible,

    destroy() {
      destroyed = true;
      visible = false;
      overlay.remove();
    },

    setSections(sections: SkeletonSection[]) {
      currentSections = sections;
      if (visible) render();
    },

    setTemplate(template: ScreenTemplate) {
      currentTemplate = template;
      currentSections = getTemplateSections(template);
      if (visible) render();
    },
  };

  return instance;
}
