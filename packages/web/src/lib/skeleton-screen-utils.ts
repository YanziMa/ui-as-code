/**
 * Skeleton Screen Utilities: Full-page skeleton loading screens that mimic
 * real layout structure, with shimmer animation, layout presets (dashboard,
 * article, profile, table, list), progressive reveal, and ARIA busy states.
 */

// --- Types ---

export type SkeletonLayout = "dashboard" | "article" | "profile" | "table" | "list" | "card-grid" | "custom";

export interface SkeletonBlock {
  /** Block type */
  type: "text" | "heading" | "avatar" | "image" | "button" | "badge" | "circle" | "rect";
  /** Width (CSS value) */
  width?: string;
  /** Height (CSS value) */
  height?: string;
  /** Border radius */
  radius?: string;
  /** Number of text lines (for type="text") */
  lines?: number;
  /** Margin bottom */
  marginBottom?: string;
}

export interface SkeletonScreenOptions {
  /** Layout preset or "custom" with blocks */
  layout?: SkeletonLayout;
  /** Custom blocks (used when layout="custom") */
  blocks?: SkeletonBlock[];
  /** Container element */
  container?: HTMLElement;
  /** Shimmer animation speed in seconds. Default 1.5s */
  shimmerSpeed?: number;
  /** Base color. Default "#f3f4f6" */
  baseColor?: string;
  /** Highlight color. Default "#e5e7eb" */
  highlightColor?: string;
  /** Border radius for all blocks. Default "6px" */
  borderRadius?: string;
  /** Padding around the skeleton screen */
  padding?: string;
  /** Max width of the skeleton */
  maxWidth?: string;
  /** Custom class name */
  className?: string;
  /** Show a fade-in when revealing content */
  fadeInOnReveal?: boolean;
  /** Fade duration in ms. Default 300 */
  fadeDuration?: number;
  /** Called when skeleton is shown */
  onShow?: () => void;
  /** Called when skeleton is hidden/revealed */
  onHide?: () => void;
}

export interface SkeletonScreenInstance {
  /** The root skeleton element */
  el: HTMLElement;
  /** Show the skeleton screen */
  show: () => void;
  /** Hide and optionally replace with real content */
  hide: (content?: HTMLElement | string) => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Update custom blocks dynamically */
  updateBlocks: (blocks: SkeletonBlock[]) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Layout Presets ---

function getDashboardBlocks(): SkeletonBlock[] {
  return [
    { type: "rect", height: "40px", width: "200px", marginBottom: "24px" },
    { type: "heading", width: "60%", marginBottom: "16px" },
    { type: "text", lines: 3, marginBottom: "24px" },
    { type: "heading", width: "40%", marginBottom: "12px" },
    ...Array.from({ length: 3 }, () => ({ type: "rect", height: "120px", width: "100%", marginBottom: "16px" } as SkeletonBlock)),
  ];
}

function getArticleBlocks(): SkeletonBlock[] {
  return [
    { type: "rect", height: "280px", width: "100%", radius: "12px", marginBottom: "20px" },
    { type: "avatar", size: "36px", marginBottom: "16px" },
    { type: "text", width: "80px", height: "14px", marginBottom: "8px" },
    { type: "heading", width: "70%", marginBottom: "12px" },
    { type: "text", lines: 2, marginBottom: "20px" },
    { type: "text", lines: 4, marginBottom: "16px" },
    { type: "text", lines: 3, marginBottom: "16px" },
    { type: "text", lines: 2 },
  ];
}

function getProfileBlocks(): SkeletonBlock[] {
  return [
    { type: "circle", width: "96px", height: "96px", marginBottom: "16px" },
    { type: "heading", width: "40%", marginBottom: "8px" },
    { type: "text", width: "30%", height: "13px", marginBottom: "20px" },
    { type: "button", width: "100px", height: "32px", marginBottom: "24px" },
    { type: "heading", width: "25%", marginBottom: "12px" },
    { type: "text", lines: 3, marginBottom: "16px" },
    { type: "heading", width: "25%", marginBottom: "12px" },
    { type: "text", lines: 2 },
  ];
}

function getTableBlocks(): SkeletonBlock[] {
  const rows = Array.from({ length: 6 }, () =>
    ({ type: "rect", height: "44px", width: "100%", marginBottom: "8px" } as SkeletonBlock)
  );
  return [
    { type: "rect", height: "48px", width: "100%", marginBottom: "12px" },
    ...rows,
  ];
}

function getListBlocks(): SkeletonBlock[] {
  return Array.from({ length: 8 }, (_, i) => ({
    type: "avatar",
    width: "40px",
    height: "40px",
    marginBottom: i < 7 ? "16px" : "0",
  } as SkeletonBlock)).concat(
    Array.from({ length: 8 }, (_, i) => ({
      type: "text",
      width: `${60 + Math.random() * 30}%`,
      height: "14px",
      marginBottom: i < 7 ? "16px" : "0",
      lines: i % 3 === 0 ? 2 : 1,
    } as SkeletonBlock))
  );
}

function getCardGridBlocks(): SkeletonBlock[] {
  return Array.from({ length: 6 }, (_, i) => ({
    type: "rect",
    height: "180px",
    width: "100%",
    radius: "10px",
    marginBottom: i < 5 ? "16px" : "0",
  } as SkeletonBlock));
}

// --- Core Factory ---

/**
 * Create a full-page skeleton loading screen.
 *
 * @example
 * ```ts
 * const skel = createSkeletonScreen({
 *   layout: "dashboard",
 *   container: document.getElementById("app"),
 * });
 * skel.show();
 * // Later:
 * skel.hide(realContent);
 * ```
 */
export function createSkeletonScreen(options: SkeletonScreenOptions = {}): SkeletonScreenInstance {
  const {
    layout = "dashboard",
    blocks,
    container,
    shimmerSpeed = 1.5,
    baseColor = "#f3f4f6",
    highlightColor = "#e5e7eb",
    borderRadius = "6px",
    padding = "24px",
    maxWidth = "800px",
    className,
    fadeInOnReveal = true,
    fadeDuration = 300,
    onShow,
    onHide,
  } = options;

  let _visible = false;

  // Root
  const root = document.createElement("div");
  root.className = `skeleton-screen ${className ?? ""}`.trim();
  root.setAttribute("aria-busy", "true");
  root.setAttribute("role", "status");
  root.setAttribute("aria-label", "Loading content");
  root.style.cssText =
    `padding:${padding};max-width:${maxWidth};margin:0 auto;` +
    "position:relative;overflow:hidden;opacity:0;transition:opacity 0.2s ease;";

  // Inject shimmer keyframes
  _injectShimmerStyles(shimmerSpeed, baseColor, highlightColor);

  // Build blocks
  _buildBlocks(blocks ?? _getPresetBlocks(layout));

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function show(): void {
    if (_visible) return;
    _visible = true;
    root.style.opacity = "1";
    root.setAttribute("aria-busy", "true");
    onShow?.();
  }

  function hide(content?: HTMLElement | string): void {
    if (!_visible) return;
    _visible = false;

    if (content && fadeInOnReveal) {
      // Fade out skeleton, then swap to content
      root.style.opacity = "0";
      setTimeout(() => {
        root.innerHTML = "";
        root.removeAttribute("aria-busy");
        root.removeAttribute("role");
        root.removeAttribute("aria-label");
        root.className = root.className.replace("skeleton-screen", "").trim();
        root.style.cssText = root.style.cssText.replace(/position:relative;overflow:hidden;opacity:0;transition:opacity[^;]*/, "");

        if (typeof content === "string") {
          root.innerHTML = content;
        } else {
          root.appendChild(content);
        }

        root.style.opacity = "0";
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            root.style.transition = `opacity ${fadeDuration}ms ease`;
            root.style.opacity = "1";
          });
        });

        onHide?.();
      }, 200);
    } else if (content) {
      root.innerHTML = "";
      root.removeAttribute("aria-busy");
      root.removeAttribute("role");
      root.removeAttribute("aria-label");

      if (typeof content === "string") {
        root.innerHTML = content;
      } else {
        root.appendChild(content);
      }
      onHide?.();
    } else {
      root.style.display = "none";
      root.setAttribute("aria-busy", "false");
      onHide?.();
    }
  }

  function isVisible(): boolean { return _visible; }

  function updateBlocks(newBlocks: SkeletonBlock[]): void {
    root.innerHTML = "";
    _buildBlocks(newBlocks);
  }

  function destroy(): void {
    root.remove();
  }

  // --- Internal ---

  function _getPresetBlocks(lyt: SkeletonLayout): SkeletonBlock[] {
    switch (lyt) {
      case "dashboard": return getDashboardBlocks();
      case "article": return getArticleBlocks();
      case "profile": return getProfileBlocks();
      case "table": return getTableBlocks();
      case "list": return getListBlocks();
      case "card-grid": return getCardGridBlocks();
      default: return [];
    }
  }

  function _buildBlocks(blockList: SkeletonBlock[]): void {
    blockList.forEach((block) => {
      const el = document.createElement("div");
      el.className = `skeleton-block skeleton-${block.type}`;

      let w = block.width ?? "100%";
      let h = block.height;
      let r = block.radius ?? borderRadius;
      const mb = block.marginBottom ?? "0";

      switch (block.type) {
        case "text":
          h = h || "14px";
          r = r || "4px";
          const lineCount = block.lines ?? 1;
          for (let i = 0; i < lineCount; i++) {
            const line = document.createElement("div");
            line.className = "skeleton-line";
            const isLast = i === lineCount - 1;
            line.style.cssText =
              `height:${h};width:${isLast && lineCount > 1 ? "60%" : w};` +
              `background:${baseColor};border-radius:${r};margin-bottom:${i < lineCount - 1 ? "8px" : "0"};`;
            el.appendChild(line);
          }
          break;

        case "heading":
          h = h || "20px";
          r = r || "4px";
          el.style.cssText = `height:${h};width:${w};background:${baseColor};border-radius:${r};`;
          break;

        case "avatar":
        case "circle":
          w = w || (block as any).size || "40px";
          h = h || w;
          el.style.cssText = `width:${w};height:${h};background:${baseColor};border-radius:50%;flex-shrink:0;`;
          break;

        case "image":
          h = h || "160px";
          r = r || "8px";
          el.style.cssText = `width:${w};height:${h};background:${baseColor};border-radius:${r};`;
          break;

        case "button":
          w = w || "80px";
          h = h || "32px";
          r = r || "16px";
          el.style.cssText = `display:inline-block;width:${w};height:${h};background:${baseColor};border-radius:${r};`;
          break;

        case "badge":
          w = w || "60px";
          h = h || "20px";
          r = r || "10px";
          el.style.cssText = `display:inline-block;width:${w};height:${h};background:${baseColor};border-radius:${r};`;
          break;

        case "rect":
        default:
          h = h || "100px";
          el.style.cssText = `width:${w};height:${h};background:${baseColor};border-radius:${r};`;
          break;
      }

      if (block.type !== "text") {
        el.style.marginBottom = mb;
      } else {
        el.style.marginBottom = mb;
      }

      root.appendChild(el);
    });
  }

  return { el: root, show, hide, isVisible, updateBlocks, destroy };
}

// --- Style Injection ---

let _shimmerInjected = false;

function _injectShimmerStyles(speed: number, baseColor: string, highlightColor: string): void {
  if (_shimmerInjected || typeof document === "undefined") return;

  const style = document.createElement("style");
  style.id = "skeleton-shimmer-styles";
  style.textContent = `
    .skeleton-screen {
      position: relative;
      overflow: hidden;
    }
    .skeleton-screen::after {
      content: '';
      position: absolute;
      inset: -50%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        ${highlightColor} 30%,
        ${highlightColor} 50%,
        transparent 70%
      );
      animation: skeleton-shimmer ${speed}s infinite linear;
      pointer-events: none;
      z-index: 1;
    }
    @keyframes skeleton-shimmer {
      0% { transform: translateX(-50%); }
      100% { transform: translateX(50%); }
    }
  `;
  document.head.appendChild(style);
  _shimmerInjected = true;
}
