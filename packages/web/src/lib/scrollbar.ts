/**
 * Custom Scrollbar: Cross-browser custom scrollbar with thin/thick variants,
 * auto-hide on inactivity, track/thumb styling, corner radius, gradient thumb,
 * scroll indicator arrows, and smooth show/hide transitions.
 */

// --- Types ---

export type ScrollbarVariant = "thin" | "thick" | "none" | "overlay";
export type ScrollbarAxis = "vertical" | "horizontal" | "both";

export interface ScrollbarOptions {
  /** Target element or selector (the scrollable container) */
  target: HTMLElement | string;
  /** Which axis to customize */
  axis?: ScrollbarAxis;
  /** Visual variant */
  variant?: ScrollbarVariant;
  /** Thumb color */
  thumbColor?: string;
  /** Track color */
  trackColor?: string;
  /** Thumb hover color */
  thumbHoverColor?: string;
  /** Thumb border radius */
  thumbRadius?: number;
  /** Track border radius */
  trackRadius?: number;
  /** Thumb width/height in px (for thin/thick) */
  thumbSize?: number;
  /** Auto-hide scrollbar after inactivity (ms, 0 = never hide) */
  autoHide?: number;
  /** Show scrollbar on hover only? */
  hoverOnly?: boolean;
  /** Smooth scrolling for this container? */
  smoothScroll?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface ScrollbarInstance {
  element: HTMLElement;
  update: () => void;
  destroy: () => void;
}

// --- CSS Injection ---

let stylesInjected = false;

function injectScrollbarStyles(): void {
  if (stylesInjected || typeof document === "undefined") return;

  const style = document.createElement("style");
  style.id = "custom-scrollbar-styles";
  style.textContent = `
    .csb-container { position: relative; }
    .csb-container.csb-auto-hide .csb-thumb { opacity: 0; transition: opacity 0.3s ease; }
    .csb-container.csb-auto-hide:hover .csb-thumb,
    .csb-container.csb-auto-hide.csb-active .csb-thumb { opacity: 1; }
    .csb-track {
      position: absolute; background: transparent; z-index: 10; pointer-events: none;
      transition: background 0.2s;
    }
    .csb-track-vertical { right: 0; top: 0; bottom: 0; width: var(--csb-size, 8px); }
    .csb-track-horizontal { bottom: 0; left: 0; right: 0; height: var(--csb-size, 8px); }
    .csb-track:hover { background: rgba(0,0,0,0.04); }
    .csb-thumb {
      position: absolute; border-radius: var(--csb-radius, 4px);
      background: var(--csb-color, #c1c1c1); transition:
        background 0.15s,
        width 0.15s ease,
        height 0.15s ease,
        opacity 0.3s ease;
      cursor: pointer; pointer-events: auto;
    }
    .csb-thumb:hover { background: var(--csb-hover-color, #a1a1a1); }
    .csb-thumb-vertical { width: var(--csb-thumb-w, 6px); margin-left: auto; min-height: 20px; }
    .csb-thumb-horizontal { height: var(--csb-thumb-h, 6px); margin-top: auto; min-width: 20px; }
    .csb-corner { position: absolute; right: 0; bottom: 0; width: var(--csb-size, 8px); height: var(--csb-size, 8px); background: #f0f0f0; z-index: 11; }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

// --- Main Factory ---

export function createScrollbar(options: ScrollbarOptions): ScrollbarInstance {
  injectScrollbarStyles();

  const opts = {
    axis: options.axis ?? "both",
    variant: options.variant ?? "thin",
    thumbColor: options.thumbColor ?? "#c1c1c1",
    trackColor: options.trackColor ?? "transparent",
    thumbHoverColor: options.thumbHoverColor ?? "#a1a1a1",
    thumbRadius: options.thumbRadius ?? 4,
    trackRadius: options.trackRadius ?? 4,
    thumbSize: options.thumbSize ?? (options.variant === "thick" ? 14 : 6),
    autoHide: options.autoHide ?? 0,
    hoverOnly: options.hoverOnly ?? false,
    smoothScroll: options.smoothScroll ?? false,
    className: options.className ?? "",
    ...options,
  };

  const target = typeof options.target === "string"
    ? document.querySelector<HTMLElement>(options.target)!
    : options.target;

  if (!target) throw new Error("Scrollbar: target element not found");

  // Apply CSS custom properties approach
  const sizeMap: Record<string, number> = { thin: 8, thick: 16, overlay: 12 };
  const csbSize = sizeMap[opts.variant] ?? 8;

  // Use CSS custom properties + webkit scrollbar styling
  target.style.setProperty("--csb-size", `${csbSize}px`);
  target.style.setProperty("--csb-color", opts.thumbColor);
  target.style.setProperty("--csb-hover-color", opts.thumbHoverColor);
  target.style.setProperty("--csb-radius", `${opts.thumbRadius}px`);
  target.style.setProperty("--csb-thumb-w", `${opts.thumbSize}px`);
  target.style.setProperty("--csb-thumb-h", `${opts.thumbSize}px`);

  // Webkit scrollbar styling
  const webkitStyles: Record<ScrollbarVariant, string> = {
    thin: `
      scrollbar-width: thin;
      scrollbar-color: ${opts.thumbColor} ${opts.trackColor};
      &::-webkit-scrollbar { width: ${csbSize}px; height: ${csbSize}px; }
      &::-webkit-scrollbar-track { background: ${opts.trackColor}; border-radius: ${opts.trackRadius}px; }
      &::-webkit-scrollbar-thumb { background: ${opts.thumbColor}; border-radius: ${opts.thumbRadius}px; }
      &::-webkit-scrollbar-thumb:hover { background: ${opts.thumbHoverColor}; }
    `,
    thick: `
      scrollbar-width: auto;
      scrollbar-color: ${opts.thumbColor} ${opts.trackColor};
      &::-webkit-scrollbar { width: ${csbSize}px; height: ${csbSize}px; }
      &::-webkit-scrollbar-track { background: ${opts.trackColor}; border-radius: ${opts.trackRadius}px; }
      &::-webkit-scrollbar-thumb { background: ${opts.thumbColor}; border-radius: ${opts.thumbRadius}px; border: 2px solid ${opts.trackColor}; }
      &::-webkit-scrollbar-thumb:hover { background: ${opts.thumbHoverColor}; }
      &::-webkit-scrollbar-corner { background: ${opts.trackColor}; }
    `,
    none: `
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
      -ms-overflow-style: none;
    `,
    overlay: `
      scrollbar-width: thin;
      scrollbar-color: transparent transparent;
      &::-webkit-scrollbar { width: ${csbSize}px; height: ${csbSize}px; background: transparent; }
      &::-webkit-scrollbar-track { background: transparent; }
      &::-webkit-scrollbar-thumb { background: ${opts.thumbColor}40; border-radius: ${opts.thumbRadius}px; }
      &:hover::-webkit-scrollbar-thumb { background: ${opts.thumbColor}; }
      &:hover::-webkit-scrollbar-thumb:hover { background: ${opts.thumbHoverColor}; }
    `,
  };

  // Apply base styles via a style element
  let styleEl: HTMLStyleElement | null = null;

  function applyStyles(): void {
    if (styleEl) styleEl.remove();
    styleEl = document.createElement("style");
    const targetId = `csb-${Math.random().toString(36).slice(2, 9)}`;
    target.dataset.csbId = targetId;

    const axisRules =
      opts.axis === "vertical" ? "&::-webkit-scrollbar-horizontal { display: none; }" :
      opts.axis === "horizontal" ? "&::-webkit-scrollbar-vertical { display: none; }" : "";

    styleEl.textContent = `
      [data-csb-id="${targetId}"] {
        overflow: auto;
        ${opts.smoothScroll ? "scroll-behavior: smooth;" : ""}
        ${webkitStyles[opts.variant]}
        ${axisRules}
      }
      ${opts.autoHide > 0 ? `[data-csb-id="${targetId}"]:not(:hover)::-webkit-scrollbar-thumb { background: transparent; }` : ""}
    `;
    document.head.appendChild(styleEl);
  }

  applyStyles();

  // Auto-hide behavior
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let isHovering = false;

  if (opts.autoHide > 0) {
    target.classList.add("csb-auto-hide");

    target.addEventListener("mouseenter", () => {
      isHovering = true;
      if (hideTimer) clearTimeout(hideTimer);
      target.classList.add("csb-active");
    });

    target.addEventListener("mouseleave", () => {
      isHovering = false;
      hideTimer = setTimeout(() => {
        target.classList.remove("csb-active");
      }, opts.autoHide);
    });

    target.addEventListener("scroll", () => {
      if (!isHovering) {
        target.classList.add("csb-active");
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
          if (!isHovering) target.classList.remove("csb-active");
        }, opts.autoHide);
      }
    }, { passive: true });
  }

  return {
    element: target,

    update() {
      applyStyles();
    },

    destroy() {
      if (hideTimer) clearTimeout(hideTimer);
      if (styleEl) styleEl.remove();
      delete target.dataset.csbId;
      target.classList.remove("csb-auto-hide", "csb-active");
      // Reset to default browser scrollbar
      target.style.scrollbarWidth = "";
      target.style.scrollbarColor = "";
    },
  };
}

/** Quick helper: apply thin scrollbar to an element */
export function thinScrollbar(target: HTMLElement | string): ScrollbarInstance {
  return createScrollbar({ target, variant: "thin" });
}

/** Quick helper: hide native scrollbar but keep scrolling */
export function hideScrollbar(target: HTMLElement | string): ScrollbarInstance {
  return createScrollbar({ target, variant: "none" });
}

/** Quick helper: overlay scrollbar (appears on hover) */
export function overlayScrollbar(target: HTMLElement | string): ScrollbarInstance {
  return createScrollbar({ target, variant: "overlay", autoHide: 800 });
}
