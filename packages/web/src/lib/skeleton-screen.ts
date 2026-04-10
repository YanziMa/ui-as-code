/**
 * Skeleton Screen: Full-page skeleton loading screen with header, sidebar, content area,
 * animated shimmer effect, multiple layout variants (dashboard, table, profile, article),
 * configurable animation speed and colors.
 */

// --- Types ---

export type SkeletonLayout = "dashboard" | "table" | "profile" | "article" | "settings" | "custom";

export interface SkeletonScreenOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Layout variant */
  layout?: SkeletonLayout;
  /** Show header skeleton */
  showHeader?: boolean;
  /** Show sidebar skeleton */
  showSidebar?: boolean;
  /** Sidebar position */
  sidebarPosition?: "left" | "right";
  /** Sidebar width (px or CSS value) */
  sidebarWidth?: string | number;
  /** Header height (px) */
  headerHeight?: number;
  /** Animation type */
  animation?: "shimmer" | "pulse" | "none";
  /** Shimmer direction */
  shimmerDirection?: "left-to-right" | "right-to-left" | "top-to-bottom";
  /** Base color */
  baseColor?: string;
  /** Highlight color for shimmer */
  highlightColor?: string;
  /** Animation speed in ms */
  speed?: number;
  /** Number of content rows to simulate */
  contentRows?: number;
  /** Custom HTML content (when layout="custom") */
  customContent?: string;
  /** Overlay mode (shows on top of existing content) */
  overlay?: boolean;
  /** Callback when shown */
  onShow?: () => void;
  /** Callback when hidden/destroyed */
  onHide?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface SkeletonScreenInstance {
  element: HTMLElement;
  show: () => void;
  hide: () => void;
  isVisible: () => boolean;
  destroy: () => void;
}

// --- Config ---

const LAYOUTS: Record<SkeletonLayout, (opts: Required<Pick<SkeletonScreenOptions, "baseColor" | "highlightColor" | "speed" | "animation" | "shimmerDirection">>) => string> = {
  dashboard: (opts) => `
    <div style="display:flex;flex-direction:column;height:100vh;">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:12px;padding:16px 24px;border-bottom:1px solid #e5e7eb;background:#fff;height:${64}px;flex-shrink:0;">
        <div style="width:160px;height:20px;border-radius:4px;background:${opts.baseColor};${shimmerStyle(opts)}"></div>
        <div style="width:100px;height:14px;border-radius:4px;background:${opts.baseColor};margin-left:auto;${shimmerStyle(opts)}"></div>
        <div style="width:40px;height:28px;border-radius:6px;background:${opts.baseColor};margin-left:12px;${shimmerStyle(opts)}"></div>
      </div>
      <!-- Body -->
      <div style="display:flex;flex:1;overflow:hidden;">
        <!-- Sidebar -->
        <div style="width:240px;border-right:1px solid #e5e7eb;background:#fafbfc;flex-shrink:0;padding:16px;display:flex;flex-direction:column;gap:8px;">
          ${Array(6).fill('<div style="height:32px;border-radius:4px;background:' + opts.baseColor + ';' + shimmerStyle(opts) + '"></div>').join("")}
        </div>
        <!-- Main -->
        <div style="flex:1;padding:24px;display:flex;flex-direction:column;gap:16px;">
          <div style="height:200px;border-radius:8px;background:${opts.baseColor};${shimmerStyle(opts)}"></div>
          <div style="display:flex;gap:16px;">
            ${Array(3).fill('<div style="flex:1;height:140px;border-radius:8px;background:' + opts.baseColor + ';' + shimmerStyle(opts) + '"></div>').join('')}
          </div>
          ${Array(4).fill('<div style="height:60px;border-radius:6px;background:' + opts.baseColor + ';' + shimmerStyle(opts)}"></div>').join('')}
        </div>
      </div>
    </div>`,

  table: (opts) => `
    <div style="display:flex;flex-direction:column;height:100vh;">
      <div style="display:flex;align-items:center;padding:16px 24px;border-bottom:1px solid #e5e7eb;background:#fff;gap:12px;flex-shrink:0;">
        <div style="width:140px;height:18px;border-radius:4px;background:${opts.baseColor};${shimmerStyle(opts)}"></div>
        <div style="flex:1;height:18px;border-radius:4px;background:${opts.baseColor};${shimmerStyle(opts)}"></div>
      </div>
      <div style="flex:1;padding:24px;overflow:auto;">
        <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          ${(() => {
            const rows = [];
            // Header row
            rows.push('<div style="display:flex;gap:12px;padding:14px 16px;border-bottom:1px solid #e5e7eb;background:#f9fafb;">');
            rows.push('<div style="width:40px;height:14px;border-radius:3px;background:${opts.baseColor};' + shimmerStyle(opts) + '></div>');
            for (const w of ["25%", "20%", "15%", "15%"]) {
              rows.push('<div style="width:' + w + ';height:14px;border-radius:3px;background:${opts.baseColor};' + shimmerStyle(opts) + '></div>');
            }
            rows.push('</div>');
            // Data rows
            for (let i = 0; i < 10; i++) {
              rows.push('<div style="display:flex;gap:12px;padding:14px 16px;border-bottom:1px solid #f3f4f6;">');
              rows.push('<div style="width:40px;height:14px;border-radius:3px;background:${opts.baseColor};' + shimmerStyle(opts) + '></div>');
              for (const w of ["25%", "20%", "15%", "15%"]) {
                rows.push('<div style="width:' + w + ';height:14px;border-radius:3px;background:${opts.baseColor};' + shimmerStyle(opts) + '></div>');
              }
              rows.push('</div>');
            }
            return rows.join('');
          })()}
        </div>
      </div>
    </div>`,

  profile: (opts) => `
    <div style="display:flex;flex-direction:column;align-items:center;min-height:100vh;padding:40px 24px;gap:24px;background:#fff;">
      <div style="width:96px;height:96px;border-radius:50%;background:${opts.baseColor};${shimmerStyle(opts)}"></div>
      <div style="width:160px;height:20px;border-radius:4px;background:${opts.baseColor};${shimmerStyle(opts)}"></div>
      <div style="width:120px;height:14px;border-radius:4px;background:${opts.baseColor};margin-top:8px;${shimmerStyle(opts)}"></div>
      <div style="display:flex;gap:16px;margin-top:24px;width:100%;max-width:500px;">
        ${Array(3).fill('<div style="flex:1;height:80px;border-radius:8px;background:${opts.baseColor};' + shimmerStyle(opts) + '></div>').join('')}
      </div>
      <div style="width:70%;max-width:500px;margin-top:24px;">
        ${Array(4).fill('<div style="height:14px;border-radius:4px;background:${opts.baseColor};margin-bottom:10px;' + shimmerStyle(opts) + '></div>').join('')}
      </div>
    </div>`,

  article: (opts) => `
    <div style="max-width:720px;margin:0 auto;padding:40px 24px;display:flex;flex-direction:column;gap:20px;">
      <div style="width:60%;height:28px;border-radius:4px;background:${opts.baseColor};${shimmerStyle(opts)}"></div>
      <div style="width:35%;height:14px;border-radius:4px;background:${opts.baseColor};${shimmerStyle(opts)}"></div>
      <div style="width:100%;height:300px;border-radius:8px;background:${opts.baseColor};${shimmerStyle(opts)}"></div>
      <div style="width:90%;height:14px;border-radius:4px;background:${opts.baseColor};${shimmerStyle(opts)}"></div>
      <div style="width:95%;height:14px;border-radius:4px;background:${opts.baseColor};margin-top:10px;${shimmerStyle(opts)}"></div>
      <div style="width:85%;height:14px;border-radius:4px;background:${opts.baseColor};margin-top:10px;${shimmerStyle(opts)}"></div>
      <div style="display:flex;gap:12px;margin-top:20px;">
        ${Array(2).fill('<div style="width:80px;height:32px;border-radius:6px;background:${opts.baseColor};' + shimmerStyle(opts) + '></div>').join('')}
      </div>
    </div>`,

  settings: (opts) => `
    <div style="display:flex;min-height:100vh;">
      <div style="width:260px;border-right:1px solid #e5e7eb;padding:24px 16px;display:flex;flex-direction:column;gap:6px;background:#fff;flex-shrink:0;">
        <div style="width:120px;height:22px;border-radius:4px;background:${opts.baseColor};${shimmerStyle(opts)}"></div>
        ${Array(12).fill('<div style="height:36px;border-radius:4px;background:${opts.baseColor};' + shimmerStyle(opts) + '></div>').join('')}
      </div>
      <div style="flex:1;padding:32px;display:flex;flex-direction:column;gap:20px;">
        <div style="width:50%;height:28px;border-radius:4px;background:${opts.baseColor};${shimmerStyle(opts)}"></div>
        <div style="width:80%;height:140px;border-radius:8px;background:${opts.baseColor};${shimmerStyle(opts)}"></div>
        <div style="width:80%;height:140px;border-radius:8px;background:${opts.baseColor};${shimmerStyle(opts)}"></div>
        <div style="width:60%;height:36px;border-radius:6px;background:${opts.baseColor};margin-top:auto;${shimmerStyle(opts)}"></div>
      </div>
    </div>`,

  custom: (_opts) => "",
};

function shimmerStyle(opts: { baseColor: string; highlightColor: string; speed: number; animation: string; shimmerDirection: string }): string {
  if (opts.animation === "none") return "";
  if (opts.animation === "pulse") return `animation:sk-pulse ${opts.speed * 0.8}ms infinite ease-in-out;`;
  const dir = opts.shimmerDirection === "right-to-left"
    ? "270deg"
    : opts.shimmerDirection === "top-to-bottom"
      ? "180deg"
      : "90deg";
  return `background-image:linear-gradient(${dir},${opts.baseColor} 0%,${opts.highlightColor} 40%,${opts.baseColor} 100%);background-size:200% 100%;animation:sk-shimmer ${opts.speed}ms infinite linear;`;
}

// --- Keyframe injection ---

let stylesInjected = false;

function injectStyles(): void {
  if (stylesInjected) return;
  const style = document.createElement("style");
  style.id = "skeleton-screen-styles";
  style.textContent = `
    @keyframes sk-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    @keyframes sk-pulse{0%,100%{opacity:1}50%{opacity:0.4}}
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

// --- Main Factory ---

export function createSkeletonScreen(options: SkeletonScreenOptions): SkeletonScreenInstance {
  injectStyles();

  const opts = {
    layout: options.layout ?? "dashboard",
    showHeader: options.showHeader ?? true,
    showSidebar: options.showSidebar ?? true,
    sidebarPosition: options.sidebarPosition ?? "left",
    sidebarWidth: options.sidebarWidth ?? 240,
    headerHeight: options.headerHeight ?? 64,
    animation: options.animation ?? "shimmer",
    shimmerDirection: options.shimmerDirection ?? "left-to-right",
    baseColor: options.baseColor ?? "#f3f4f6",
    highlightColor: options.highlightColor ?? "#e5e7eb",
    speed: options.speed ?? 1500,
    overlay: options.overlay ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("SkeletonScreen: container not found");

  let visible = false;
  let wrapper: HTMLElement | null = null;

  function render(): void {
    if (wrapper) wrapper.remove();

    wrapper = document.createElement("div");
    wrapper.className = `skeleton-screen ${opts.className}`;
    wrapper.style.cssText = opts.overlay
      ? "position:absolute;inset:0;z-index:9999;background:rgba(255,255,255,0.92);"
      : "";

    let html: string;
    if (opts.layout === "custom") {
      html = opts.customContent ?? "";
    } else {
      html = LAYOUTS[opts.layout]!(opts);
    }

    wrapper.innerHTML = html;

    if (opts.overlay) {
      container.style.position = "relative";
    }

    container.appendChild(wrapper);
  }

  const instance: SkeletonScreenInstance = {
    element: container as unknown as HTMLElement,

    show() {
      if (visible) return;
      visible = true;
      render();
      opts.onShow?.();
    },

    hide() {
      if (!visible) return;
      visible = false;
      wrapper?.remove();
      opts.onHide?.();
    },

    isVisible: () => visible,

    destroy() {
      instance.hide();
    },
  };

  return instance;
}
