/**
 * Popconfirm: Popover confirmation dialog attached to a trigger element.
 * Supports OK/Cancel actions, icon, custom placement, arrow indicator,
 * async confirmation with loading state, keyboard navigation,
 * and configurable delay before showing.
 */

// --- Types ---

export type PopconfirmPlacement = "top" | "top-start" | "top-end" | "bottom" | "bottom-start" | "bottom-end" | "left" | "left-start" | "left-end" | "right" | "right-start" | "right-end";

export interface PopconfirmOptions {
  /** Trigger element or selector */
  trigger: HTMLElement | string;
  /** Confirmation title */
  title: string;
  /** Description text (optional) */
  description?: string;
  /** OK button text */
  okText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Placement relative to trigger */
  placement?: PopconfirmPlacement;
  /** Show arrow indicator */
  showArrow?: boolean;
  /** Icon (emoji or HTML string) shown in the popover */
  icon?: string;
  /** Danger mode (OK button styled as danger) */
  danger?: boolean;
  /** Disable auto-close on OK/Cancel */
  manualClose?: boolean;
  /** Delay before showing popover on hover (ms) */
  showDelay?: number;
  /** Delay before hiding popover on leave (ms) */
  hideDelay?: number;
  /** Show on click instead of hover */
  triggerMode?: "hover" | "click" | "focus";
  /** Z-index */
  zIndex?: number;
  /** Custom width for popover */
  width?: number | string;
  /** Callback on confirm (can return Promise for async) */
  onConfirm?: () => boolean | void | Promise<boolean | void>;
  /** Callback on cancel */
  onCancel?: () => void;
  /** Callback when popover visibility changes */
  onVisibleChange?: (visible: boolean) => void;
  /** Custom CSS class */
  className?: string;
}

export interface PopconfirmInstance {
  element: HTMLElement;
  show: () => void;
  hide: () => void;
  isVisible: () => boolean;
  destroy: () => void;
}

// --- Placement Helpers ---

const PLACEMENT_MAP: Record<string, { main: "top" | "bottom" | "left" | "right"; align: "start" | "center" | "end" }> = {
  "top":         { main: "top",    align: "center" },
  "top-start":   { main: "top",    align: "start" },
  "top-end":     { main: "top",    align: "end" },
  "bottom":      { main: "bottom", align: "center" },
  "bottom-start":{ main: "bottom", align: "start" },
  "bottom-end":  { main: "bottom", align: "end" },
  "left":        { main: "left",   align: "center" },
  "left-start":  { main: "left",   align: "start" },
  "left-end":    { main: "left",   align: "end" },
  "right":       { main: "right",  align: "center" },
  "right-start": { main: "right",  align: "start" },
  "right-end":   { main: "right",  align: "end" },
};

function getArrowPosition(mainDir: string): { top: string; left: string; rotation: string } {
  switch (mainDir) {
    case "top":    return { top: "100%", left: "50%", rotation: "135deg" };
    case "bottom": return { top: "-6px",  left: "50%", rotation: "-45deg" };
    case "left":   return { top: "50%",   left: "100%", rotation: "225deg" };
    case "right":  return { top: "50%",   left: "-6px",  rotation: "45deg" };
    default:       return { top: "100%", left: "50%", rotation: "135deg" };
  }
}

function calculatePosition(
  triggerRect: DOMRect,
  popoverEl: HTMLElement,
  placement: PopconfirmPlacement,
  offset: number = 8,
): { top: number; left: number } {
  const pw = popoverEl.offsetWidth;
  const ph = popoverEl.offsetHeight;
  const p = PLACEMENT_MAP[placement] ?? PLACEMENT_MAP.top;

  let top: number;
  let left: number;

  // Main direction
  switch (p.main) {
    case "top":
      top = triggerRect.top - ph - offset + window.scrollY;
      break;
    case "bottom":
      top = triggerRect.bottom + offset + window.scrollY;
      break;
    case "left":
      top = triggerRect.top + triggerRect.height / 2 - ph / 2 + window.scrollY;
      break;
    case "right":
      top = triggerRect.top + triggerRect.height / 2 - ph / 2 + window.scrollY;
      break;
  }

  // Alignment
  switch (p.align) {
    case "start":
      left = triggerRect.left + window.scrollX;
      break;
    case "end":
      left = triggerRect.right - pw + window.scrollX;
      break;
    default: // center
      left = triggerRect.left + (triggerRect.width - pw) / 2 + window.scrollX;
  }

  return { top, left };
}

// --- Main Factory ---

export function createPopconfirm(options: PopconfirmOptions): PopconfirmInstance {
  const opts = {
    placement: options.placement ?? "top",
    showArrow: options.showArrow ?? true,
    okText: options.okText ?? "OK",
    cancelText: options.cancelText ?? "Cancel",
    danger: options.danger ?? false,
    manualClose: options.manualClose ?? false,
    showDelay: options.showDelay ?? 150,
    hideDelay: options.hideDelay ?? 200,
    triggerMode: options.triggerMode ?? "click",
    zIndex: options.zIndex ?? 1050,
    className: options.className ?? "",
    ...options,
  };

  const triggerEl = typeof options.trigger === "string"
    ? document.querySelector<HTMLElement>(options.trigger)!
    : options.trigger;

  if (!triggerEl) throw new Error("Popconfirm: trigger element not found");

  let visible = false;
  let destroyed = false;
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let isLoading = false;

  // Popover element
  const popover = document.createElement("div");
  popover.className = `popconfirm ${opts.className}`;
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-modal", "false");
  popover.style.cssText = `
    position:absolute;display:none;z-index:${opts.zIndex};
    min-width:220px;${typeof opts.width === "number" ? `width:${opts.width}px;` : typeof opts.width === "string" ? `width:${opts.width};` : ""}
    background:#fff;border:1px solid #e5e7eb;border-radius:8px;
    box-shadow:0 10px 40px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.08);
    padding:14px 16px;font-family:-apple-system,sans-serif;
    font-size:13px;color:#374151;line-height:1.5;
    animation:pc-fade-in 0.15s ease-out;
  `;
  document.body.appendChild(popover);

  // Arrow
  let arrowEl: HTMLDivElement | null = null;
  if (opts.showArrow) {
    arrowEl = document.createElement("div");
    arrowEl.className = "popconfirm-arrow";
    arrowEl.style.cssText = `
      position:absolute;width:10px;height:10px;background:#fff;
      border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;
      transform:rotate(45deg);
    `;
    popover.appendChild(arrowEl);
  }

  // Content area
  const contentArea = document.createElement("div");
  contentArea.className = "popconfirm-content";
  contentArea.style.cssText = "display:flex;gap:8px;margin-bottom:12px;";

  // Icon
  if (opts.icon) {
    const iconEl = document.createElement("span");
    iconEl.innerHTML = opts.icon;
    iconEl.style.cssText = "flex-shrink:0;display:flex;align-items:center;font-size:18px;";
    contentArea.appendChild(iconEl);
  } else if (opts.danger) {
    const warnIcon = document.createElement("span");
    warnIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    warnIcon.style.cssText = "flex-shrink:0;display:flex;align-items:center;";
    contentArea.appendChild(warnIcon);
  } else {
    const qIcon = document.createElement("span");
    qIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    qIcon.style.cssText = "flex-shrink:0;display:flex;align-items:center;";
    contentArea.appendChild(qIcon);
  }

  // Text
  const textArea = document.createElement("div");
  textArea.className = "popconfirm-text";

  const titleEl = document.createElement("div");
  titleEl.className = "popconfirm-title";
  titleEl.style.cssText = "font-weight:600;color:#111827;font-size:13px;";
  titleEl.textContent = opts.title;
  textArea.appendChild(titleEl);

  if (opts.description) {
    const descEl = document.createElement("div");
    descEl.className = "popconfirm-description";
    descEl.style.cssText = "color:#6b7280;font-size:12px;margin-top:2px;";
    descEl.textContent = opts.description;
    textArea.appendChild(descEl);
  }

  contentArea.appendChild(textArea);
  popover.appendChild(contentArea);

  // Action buttons
  const actionsRow = document.createElement("div");
  actionsRow.className = "popconfirm-actions";
  actionsRow.style.cssText = "display:flex;justify-content:flex-end;gap:8px;";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = opts.cancelText;
  cancelBtn.style.cssText = `
    padding:4px 14px;border-radius:4px;font-size:12px;font-weight:500;
    cursor:pointer;border:1px solid #d1d5db;background:#fff;color:#374151;
    transition:all 0.15s;
  `;
  cancelBtn.addEventListener("mouseenter", () => { cancelBtn.style.background = "#f9fafb"; });
  cancelBtn.addEventListener("mouseleave", () => { cancelBtn.style.background = "#fff"; });

  const okBtn = document.createElement("button");
  okBtn.type = "button";
  okBtn.textContent = opts.okText;
  okBtn.style.cssText = `
    padding:4px 14px;border-radius:4px;font-size:12px;font-weight:500;
    cursor:pointer;border:none;transition:all 0.15s;
    ${opts.danger
      ? "background:#dc2626;color:#fff;"
      : "background:#4338ca;color:#fff;"}
  `;
  okBtn.addEventListener("mouseenter", () => {
    okBtn.style.opacity = "0.85";
  });
  okBtn.addEventListener("mouseleave", () => {
    okBtn.style.opacity = "";
  });

  actionsRow.append(cancelBtn, okBtn);
  popover.appendChild(actionsRow);

  // Inject keyframe
  if (!document.getElementById("popconfirm-styles")) {
    const s = document.createElement("style");
    s.id = "popconfirm-styles";
    s.textContent = "@keyframes pc-fade-in{from{opacity:0;transform:scale(0.96);}to{opacity:1;transform:scale(1);}}";
    document.head.appendChild(s);
  }

  // Positioning
  function positionPopover(): void {
    const rect = triggerEl.getBoundingClientRect();
    const pos = calculatePosition(rect, popover, opts.placement);
    popover.style.top = `${pos.top}px`;
    popover.style.left = `${pos.left}px`;

    // Position arrow
    if (arrowEl && opts.showArrow) {
      const p = PLACEMENT_MAP[opts.placement] ?? PLACEMENT_MAP.top;
      const arrowPos = getArrowPosition(p.main);
      arrowEl.style.top = arrowPos.top;
      arrowEl.style.left = arrowPos.left;
      arrowEl.style.transform = `rotate(${arrowPos.rotation})`;
      arrowEl.style.marginLeft = p.align === "center" ? "-5px" : p.align === "end" ? "-15px" : "5px";
      arrowEl.style.marginTop = (p.main === "top" || p.main === "bottom") ? "-5px" : "";
    }
  }

  // Boundary check + flip
  function checkBounds(): void {
    const pr = popover.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let needsReposition = false;
    let newPlacement = opts.placement;

    // Horizontal overflow
    if (pr.left < 8) {
      newPlacement = opts.placement.replace(/^(top|bottom)/, "$1-start") as PopconfirmPlacement;
      needsReposition = true;
    } else if (pr.right > vw - 8) {
      newPlacement = opts.placement.replace(/^(top|bottom)/, "$1-end") as PopconfirmPlacement;
      needsReposition = true;
    }

    // Vertical overflow
    if (pr.top < 8) {
      if (opts.placement.startsWith("top")) {
        newPlacement = opts.placement.replace("top", "bottom") as PopconfirmPlacement;
        needsReposition = true;
      }
    } else if (pr.bottom > vh - 8) {
      if (opts.placement.startsWith("bottom")) {
        newPlacement = opts.placement.replace("bottom", "top") as PopconfirmPlacement;
        needsReposition = true;
      }
    }

    if (needsReposition) {
      const rect = triggerEl.getBoundingClientRect();
      const pos = calculatePosition(rect, popover, newPlacement);
      popover.style.top = `${pos.top}px`;
      popover.style.left = `${pos.left}px`;

      if (arrowEl) {
        const p = PLACEMENT_MAP[newPlacement] ?? PLACEMENT_MAP.top;
        const arrowPos = getArrowPosition(p.main);
        arrowEl.style.top = arrowPos.top;
        arrowEl.style.left = arrowPos.left;
        arrowEl.style.transform = `rotate(${arrowPos.rotation})`;
      }
    }
  }

  // Show
  function show(): void {
    if (visible || destroyed || isLoading) return;
    visible = true;
    popover.style.display = "block";
    positionPopover();
    checkBounds();
    opts.onVisibleChange?.(true);
  }

  // Hide
  function hide(): void {
    if (!visible || destroyed) return;
    visible = false;
    popover.style.display = "none";
    opts.onVisibleChange?.(false);
  }

  // Confirm handler
  async function handleConfirm(): Promise<void> {
    if (isLoading) return;
    const result = opts.onConfirm?.();

    if (result instanceof Promise) {
      isLoading = true;
      okBtn.disabled = true;
      cancelBtn.disabled = true;
      okBtn.textContent = "...";
      try {
        const shouldClose = await result;
        if (shouldClose !== false && !opts.manualClose) {
          hide();
        }
      } catch {
        // Keep open on error
      } finally {
        isLoading = false;
        okBtn.disabled = false;
        cancelBtn.disabled = false;
        okBtn.textContent = opts.okText;
      }
    } else {
      if (result !== false && !opts.manualClose) {
        hide();
      }
    }
  }

  // Event bindings based on trigger mode
  if (opts.triggerMode === "hover") {
    triggerEl.addEventListener("mouseenter", () => {
      if (hideTimer) clearTimeout(hideTimer);
      showTimer = setTimeout(show, opts.showDelay);
    });
    triggerEl.addEventListener("mouseleave", () => {
      if (showTimer) clearTimeout(showTimer);
      hideTimer = setTimeout(hide, opts.hideDelay);
    });
    popover.addEventListener("mouseenter", () => {
      if (hideTimer) clearTimeout(hideTimer);
    });
    popover.addEventListener("mouseleave", () => {
      hideTimer = setTimeout(hide, opts.hideDelay);
    });
  } else if (opts.triggerMode === "focus") {
    triggerEl.addEventListener("focus", () => {
      showTimer = setTimeout(show, opts.showDelay);
    });
    triggerEl.addEventListener("blur", () => {
      hideTimer = setTimeout(hide, opts.hideDelay);
    });
  } else {
    // click (default)
    triggerEl.addEventListener("click", (e) => {
      e.stopPropagation();
      if (visible) {
        hide();
      } else {
        show();
      }
    });
  }

  // Button events
  okBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    handleConfirm();
  });
  cancelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    opts.onCancel?.();
    if (!opts.manualClose) hide();
  });

  // Click outside to close
  document.addEventListener("mousedown", (e) => {
    if (visible && !popover.contains(e.target as Node) && !triggerEl.contains(e.target as Node)) {
      hide();
    }
  });

  // Escape to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && visible) {
      opts.onCancel?.();
      if (!opts.manualClose) hide();
    }
  });

  // Reposition on scroll/resize
  const reposition = () => { if (visible) { positionPopover(); checkBounds(); } };
  window.addEventListener("scroll", reposition, { passive: true });
  window.addEventListener("resize", reposition, { passive: true });

  const instance: PopconfirmInstance = {
    element: popover,

    show,
    hide,

    isVisible() { return visible; },

    destroy() {
      destroyed = true;
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
      window.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
      popover.remove();
    },
  };

  return instance;
}
