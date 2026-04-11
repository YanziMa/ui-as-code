/**
 * Drawer Utilities: Side panel drawer with slide animation, size variants,
 * backdrop, keyboard support, nested drawers, and responsive behavior.
 */

// --- Types ---

export type DrawerSide = "left" | "right";
export type DrawerSize = "sm" | "md" | "lg" | "xl" | number;

export interface DrawerOptions {
  /** Content (HTMLElement or HTML string) */
  content: HTMLElement | string;
  /** Which side to slide from */
  side?: DrawerSide;
  /** Width of the drawer */
  size?: DrawerSize;
  /** Show backdrop overlay */
  backdrop?: boolean;
  /** Click backdrop to close */
  backdropDismiss?: boolean;
  /** Escape to dismiss */
  escapeDismiss?: boolean;
  /** Animation duration (ms) */
  duration?: number;
  /** Custom class name */
  className?: string;
  /** Z-index */
  zIndex?: number;
  /** Lock body scroll when open */
  lockScroll?: boolean;
  /** Header element or HTML */
  header?: HTMLElement | string;
  /** Close button in header */
  showCloseButton?: boolean;
  /** Called on open */
  onOpen?: () => void;
  /** Called on close */
  onClose?: () => void;
}

export interface DrawerInstance {
  /** The drawer wrapper element */
  el: HTMLElement;
  /** Open the drawer */
  open: () => void;
  /** Close the drawer */
  close: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Update content */
  setContent: (content: HTMLElement | string) => void;
  /** Set header */
  setHeader: (header: HTMLElement | string) => void;
  /** Destroy and remove from DOM */
  destroy: () => void;
}

// --- Size Map ---

const DRAWER_SIZES: Record<string, string> = {
  "sm": "280px",
  "md": "360px",
  "lg": "440px",
  "xl": "560px",
};

// --- Core Factory ---

/**
 * Create a side drawer panel.
 *
 * @example
 * ```ts
 * const drawer = createDrawer({
 *   content: "<nav>Navigation items...</nav>",
 *   side: "left",
 *   size: "md",
 *   showCloseButton: true,
 * });
 * drawer.open();
 * ```
 */
export function createDrawer(options: DrawerOptions): DrawerInstance {
  const {
    content,
    side = "right",
    size = "md",
    backdrop = true,
    backdropDismiss = true,
    escapeDismiss = true,
    duration = 280,
    className,
    zIndex = 1050,
    lockScroll = true,
    header,
    showCloseButton = false,
    onOpen,
    onClose,
  } = options;

  let _open = false;
  let cleanupFns: Array<() => void> = [];
  let unlockFn: (() => void) | null = null;

  const widthValue = typeof size === "number" ? `${size}px` : (DRAWER_SIZES[size] ?? size);

  // Overlay
  const overlay = document.createElement("div");
  overlay.className = `drawer-overlay ${className ?? ""}`.trim();
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:auto;display:none;" +
    `z-index:${zIndex};`;

  // Backdrop
  let backdropEl: HTMLElement | null = null;
  if (backdrop) {
    backdropEl = document.createElement("div");
    backdropEl.className = "drawer-backdrop";
    backdropEl.style.cssText =
      "position:absolute;inset:0;background:rgba(0,0,0,0.3);" +
      `transition:opacity ${duration}ms ease;opacity:0;`;
    overlay.appendChild(backdropEl);
  }

  // Panel
  const panel = document.createElement("div");
  panel.className = "drawer-panel";
  const translateX = side === "right" ? "translateX(100%)" : "translateX(-100%)";
  panel.style.cssText =
    `width:${widthValue};max-width:100vw;height:100%;background:#fff;` +
    `transform:${translateX};transition:transform ${duration}ms cubic-bezier(0.22,1,0.36,1);` +
    `box-shadow:${side === "right" ? "-8px 0 24px rgba(0,0,0,0.12)" : "8px 0 24px rgba(0,0,0,0.12)"};` +
    "display:flex;flex-direction:column;position:relative;overflow:hidden;";

  // Header
  let headerEl: HTMLElement | null = null;
  if (header || showCloseButton) {
    headerEl = document.createElement("div");
    headerEl.className = "drawer-header";
    headerEl.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;" +
      "padding:16px 20px;border-bottom:1px solid #f3f4f6;flex-shrink:0;min-height:56px;";

    if (header) {
      const titleArea = document.createElement("div");
      titleArea.className = "drawer-title";
      titleArea.innerHTML = typeof header === "string" ? header : "";
      if (typeof header !== "string") titleArea.appendChild(header);
      headerEl.appendChild(titleArea);
    }

    if (showCloseButton) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "drawer-close-btn";
      closeBtn.type = "button";
      closeBtn.setAttribute("aria-label", "Close drawer");
      closeBtn.style.cssText =
        "border:none;background:none;cursor:pointer;padding:4px;border-radius:6px;" +
        "display:flex;align-items:center;justify-content:center;width:32px;height:32px;" +
        "font-size:20px;color:#6b7280;transition:background 0.15s;";
      closeBtn.innerHTML = "&times;";
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#f3f4f6"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; });
      closeBtn.addEventListener("click", close);
      headerEl.appendChild(closeBtn);
    }

    panel.appendChild(headerEl);
  }

  // Body
  const body = document.createElement("div");
  body.className = "drawer-body";
  body.style.cssText = "flex:1;overflow-y:auto;padding:20px;";
  if (typeof content === "string") {
    body.innerHTML = content;
  } else {
    body.appendChild(content);
  }
  panel.appendChild(body);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // --- Methods ---

  function open(): void {
    if (_open) return;
    _open = true;
    overlay.style.display = "block";

    if (lockScroll) unlockFn = _lockScroll();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.style.transform = "translateX(0)";
        if (backdropEl) backdropEl.style.opacity = "1";
      });
    });

    _setupListeners();
    onOpen?.();
  }

  function close(): void {
    if (!_open) return;
    _open = true; // Keep true during animation

    panel.style.transform = translateX;
    if (backdropEl) backdropEl.style.opacity = "0";

    setTimeout(() => {
      _open = false;
      overlay.style.display = "none";
      _removeListeners();
      unlockFn?.();
      unlockFn = null;
      onClose?.();
    }, duration);
  }

  function toggle(): void { _open ? close() : open(); }
  function isOpen(): boolean { return _open; }

  function setContent(newContent: HTMLElement | string): void {
    body.innerHTML = "";
    if (typeof newContent === "string") {
      body.innerHTML = newContent;
    } else {
      body.appendChild(newContent);
    }
  }

  function setHeader(newHeader: HTMLElement | string): void {
    if (!headerEl) return;
    const titleArea = headerEl.querySelector(".drawer-title");
    if (titleArea) {
      titleArea.innerHTML = typeof newHeader === "string" ? newHeader : "";
      if (typeof newHeader !== "string") titleArea.appendChild(newHeader);
    }
  }

  function destroy(): void {
    if (_open) {
      _open = false;
      overlay.style.display = "none";
      _removeListeners();
      unlockFn?.();
    }
    overlay.remove();
  }

  // --- Internal ---

  function _setupListeners(): void {
    if (backdrop && backdropDismiss && backdropEl) {
      backdropEl.addEventListener("click", close);
      cleanupFns.push(() => backdropEl!.removeEventListener("click", close));
    }

    if (escapeDismiss) {
      const escHandler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
      document.addEventListener("keydown", escHandler);
      cleanupFns.push(() => document.removeEventListener("keydown", escHandler));
    }
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return { el: overlay, open, close, toggle, isOpen, setContent, setHeader, destroy };
}

/** Simple scroll lock for drawer */
function _lockScroll(): () => void {
  const body = document.body;
  const originalOverflow = body.style.overflow;
  const originalPR = body.style.paddingRight;
  const sbWidth = window.innerWidth - document.documentElement.clientWidth;

  body.style.overflow = "hidden";
  if (sbWidth > 0) {
    const currentPR = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${currentPR + sbWidth}px`;
  }

  return () => {
    body.style.overflow = originalOverflow;
    body.style.paddingRight = originalPR;
  };
}
