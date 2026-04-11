/**
 * Tooltip & Popover: Smart positioning system with auto-flip, arrow indicator,
 * multiple triggers (hover, click, focus, manual), animations, virtual
 * boundary detection, and accessibility (ARIA).
 *
 * Supports:
 * - Tooltips: Simple text/HTML tips on hover/focus
 * - Popovers: Rich content panels with header/body/footer
 * - Auto-placement: 12 positions with automatic boundary flipping
 * - Arrow indicator: CSS-based arrow pointing to anchor element
 * - Multiple trigger modes: hover, click, focus, manual, or combination
 * - Virtual element support: Position relative to cursor or arbitrary coordinates
 * - Boundary containment: Keep within viewport or custom container
 * - Grouped tooltips: Only one visible at a time within a group
 */

// --- Types ---

export type Placement = "top" | "top-start" | "top-end" | "bottom" | "bottom-start" | "bottom-end"
  | "left" | "left-start" | "left-end" | "right" | "right-start" | "right-end";

export type TriggerMode = "hover" | "click" | "focus" | "manual" | "hover-focus";

export interface TooltipOptions {
  /** Anchor element */
  anchor: HTMLElement;
  /** Content (string or HTML element) */
  content: string | HTMLElement;
  /** Preferred placement (default: "top") */
  placement?: Placement;
  /** Trigger mode(s) — can be combined as array */
  trigger?: TriggerMode | TriggerMode[];
  /** Show arrow? (default: true for tooltip, false for popover) */
  arrow?: boolean;
  /** Arrow size in px (default: 8) */
  arrowSize?: number;
  /** Offset from anchor in px (default: 8) */
  offset?: number;
  /** Delay before show on hover (ms, default: 200) */
  showDelay?: number;
  /** Delay before hide on hover (ms, default: 100) */
  hideDelay?: number;
  /** Max width (default: 300px) */
  maxWidth?: number;
  /** Z-index (default: 10500) */
  zIndex?: number;
  /** Animation duration (ms, default: 150) */
  animationDuration?: number;
  /** Custom CSS class */
  className?: string;
  /** Group ID — only one tooltip per group visible at once */
  group?: string;
  /** Boundary container for auto-flip (default: viewport) */
  boundary?: HTMLElement | "viewport" | "window";
  /** Padding inside boundary (default: 8) */
  boundaryPadding?: number;
  /** Disable auto-flip when overflowing */
  disableFlip?: boolean;
  /** Callback on show */
  onShow?: () => void;
  /** Callback on hide */
  onHide?: () => void;
}

export interface PopoverOptions extends Omit<TooltipOptions, "content"> {
  /** Title/header text */
  title?: string;
  /** Body content */
  body: string | HTMLElement;
  /** Footer content */
  footer?: string | HTMLElement;
  /** Close button in header? (default: true) */
  closable?: boolean;
  /** Width (default: 320px) */
  width?: number | string;
  /** Height constraint */
  maxHeight?: number | string;
}

export interface TooltipInstance {
  /** The tooltip/popover DOM element */
  element: HTMLElement;
  /** Show the tooltip */
  show: () => void;
  /** Hide the tooltip */
  hide: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Check if currently visible */
  isVisible: () => boolean;
  /** Update content dynamically */
  setContent: (content: string | HTMLElement) => void;
  /** Update placement */
  setPlacement: (placement: Placement) => void;
  /** Reposition (call after layout changes) */
  updatePosition: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Internal Types ---

interface PositionedResult {
  x: number;
  y: number;
  placement: Placement;
  arrowX?: number;
  arrowY?: number;
}

// --- Global State ---

const activeGroups = new Map<string, TooltipInstance>();

// --- Main Factory ---

export function createTooltip(options: TooltipOptions): TooltipInstance {
  const opts = {
    placement: options.placement ?? "top",
    trigger: Array.isArray(options.trigger) ? options.trigger : [options.trigger ?? "hover"],
    arrow: options.arrow ?? true,
    arrowSize: options.arrowSize ?? 8,
    offset: options.offset ?? 8,
    showDelay: options.showDelay ?? 200,
    hideDelay: options.hideDelay ?? 100,
    maxWidth: options.maxWidth ?? 300,
    zIndex: options.zIndex ?? 10500,
    animationDuration: options.animationDuration ?? 150,
    className: options.className ?? "",
    boundary: options.boundary ?? "viewport",
    boundaryPadding: options.boundaryPadding ?? 8,
    disableFlip: options.disableFlip ?? false,
    ...options,
  };

  const anchor = opts.anchor;

  // Create tooltip element
  const el = document.createElement("div");
  el.className = `tooltip ${opts.className}`;
  el.setAttribute("role", "tooltip");
  el.style.cssText = `
    position: absolute; z-index: ${opts.zIndex};
    max-width: ${opts.maxWidth}px; pointer-events: none;
    opacity: 0; transition: opacity ${opts.animationDuration}ms ease,
      transform ${opts.animationDuration}ms ease;
    transform-origin: center;
  `;

  // Content wrapper
  const contentWrap = document.createElement("div");
  contentWrap.className = "tooltip-content";
  contentWrap.style.cssText = `
    padding: 6px 12px; border-radius: 6px; font-size: 12px; line-height: 1.4;
    background: #1f2937; color: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  `;
  setContent(contentWrap, options.content);
  el.appendChild(contentWrap);

  // Arrow
  let arrowEl: HTMLElement | null = null;
  if (opts.arrow) {
    arrowEl = document.createElement("div");
    arrowEl.className = "tooltip-arrow";
    arrowEl.style.cssText = `
      position: absolute; width: 0; height: 0;
      border: ${opts.arrowSize}px solid transparent;
    `;
    el.appendChild(arrowEl);
  }

  document.body.appendChild(el);

  // State
  let visible = false;
  let currentPlacement = opts.placement;
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  function setContent(container: HTMLElement, content: string | HTMLElement): void {
    container.innerHTML = "";
    if (typeof content === "string") {
      container.innerHTML = content;
    } else {
      container.appendChild(content);
    }
  }

  function calculatePosition(): PositionedResult {
    const anchorRect = anchor.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    // Use actual size if already rendered, otherwise estimate
    const elWidth = elRect.width || opts.maxWidth;
    const elHeight = elRect.height || 40;

    const placements = getPlacementOrder(currentPlacement);
    let best: PositionedResult | null = null;

    for (const placement of placements) {
      const pos = positionForPlacement(placement, anchorRect, elWidth, elHeight);
      if (!opts.disableFlip && isWithinBoundary(pos, elWidth, elHeight)) {
        best = pos;
        break;
      }
      if (!best) best = pos; // Fallback to first calculated position
    }

    return best!;
  }

  function getPlacementOrder(preferred: Placement): Placement[] {
    const map: Record<Placement, Placement[]> = {
      "top": ["top", "bottom", "left", "right"],
      "top-start": ["top-start", "top-end", "bottom-start", "left-start"],
      "top-end": ["top-end", "top-start", "bottom-end", "right-end"],
      "bottom": ["bottom", "top", "left", "right"],
      "bottom-start": ["bottom-start", "bottom-end", "top-start", "left-start"],
      "bottom-end": ["bottom-end", "bottom-start", "top-end", "right-end"],
      "left": ["left", "right", "top", "bottom"],
      "left-start": ["left-start", "left-end", "top-start", "bottom-start"],
      "left-end": ["left-end", "left-start", "top-end", "bottom-end"],
      "right": ["right", "left", "top", "bottom"],
      "right-start": ["right-start", "right-end", "top-start", "bottom-start"],
      "right-end": ["right-end", "right-start", "top-end", "bottom-end"],
    };
    return map[preferred] ?? [preferred];
  }

  function positionForPlacement(
    placement: Placement,
    anchorRect: DOMRect,
    elW: number,
    elH: number,
  ): PositionedResult {
    const off = opts.offset;
    let x: number, y: number;
    let arrowX: number | undefined, arrowY: number | undefined;

    switch (placement) {
      case "top":
        x = anchorRect.left + anchorRect.width / 2 - elW / 2;
        y = anchorRect.top - elH - off;
        arrowX = elW / 2;
        arrowY = elH;
        break;
      case "top-start":
        x = anchorRect.left;
        y = anchorRect.top - elH - off;
        arrowX = opts.arrowSize + 4;
        arrowY = elH;
        break;
      case "top-end":
        x = anchorRect.right - elW;
        y = anchorRect.top - elH - off;
        arrowX = elW - opts.arrowSize - 4;
        arrowY = elH;
        break;
      case "bottom":
        x = anchorRect.left + anchorRect.width / 2 - elW / 2;
        y = anchorRect.bottom + off;
        arrowX = elW / 2;
        arrowY = -opts.arrowSize;
        break;
      case "bottom-start":
        x = anchorRect.left;
        y = anchorRect.bottom + off;
        arrowX = opts.arrowSize + 4;
        arrowY = -opts.arrowSize;
        break;
      case "bottom-end":
        x = anchorRect.right - elW;
        y = anchorRect.bottom + off;
        arrowX = elW - opts.arrowSize - 4;
        arrowY = -opts.arrowSize;
        break;
      case "left":
        x = anchorRect.left - elW - off;
        y = anchorRect.top + anchorRect.height / 2 - elH / 2;
        arrowX = elW;
        arrowY = elH / 2;
        break;
      case "left-start":
        x = anchorRect.left - elW - off;
        y = anchorRect.top;
        arrowX = elW;
        arrowY = opts.arrowSize + 4;
        break;
      case "left-end":
        x = anchorRect.left - elW - off;
        y = anchorRect.bottom - elH;
        arrowX = elW;
        arrowY = elH - opts.arrowSize - 4;
        break;
      case "right":
        x = anchorRect.right + off;
        y = anchorRect.top + anchorRect.height / 2 - elH / 2;
        arrowX = -opts.arrowSize;
        arrowY = elH / 2;
        break;
      case "right-start":
        x = anchorRect.right + off;
        y = anchorRect.top;
        arrowX = -opts.arrowSize;
        arrowY = opts.arrowSize + 4;
        break;
      case "right-end":
        x = anchorRect.right + off;
        y = anchorRect.bottom - elH;
        arrowX = -opts.arrowSize;
        arrowY = elH - opts.arrowSize - 4;
        break;
    }

    return { x, y, placement, arrowX, arrowY };
  }

  function isWithinBoundary(pos: PositionedResult, w: number, h: number): boolean {
    const pad = opts.boundaryPadding;
    if (opts.boundary === "viewport" || opts.boundary === "window") {
      return pos.x >= pad && pos.y >= pad &&
        pos.x + w <= window.innerWidth - pad &&
        pos.y + h <= window.innerHeight - pad;
    }
    // Custom boundary element
    const boundary = opts.boundary as HTMLElement;
    const rect = boundary.getBoundingClientRect();
    return pos.x >= rect.left + pad && pos.y >= rect.top + pad &&
      pos.x + w <= rect.right - pad && pos.y + h <= rect.bottom - pad;
  }

  function applyPosition(result: PositionedResult): void {
    el.style.left = `${result.x}px`;
    el.style.top = `${result.y}px`;
    currentPlacement = result.placement;

    // Arrow positioning
    if (arrowEl && result.arrowX !== undefined && result.arrowY !== undefined) {
      const isHorizontal = currentPlacement.startsWith("left") || currentPlacement.startsWith("right");
      if (isHorizontal) {
        arrowEl.style.left = `${result.arrowX}px`;
        arrowEl.style.top = `${result.arrowY}px`;
        arrowEl.style.borderTopColor = "transparent";
        arrowEl.style.borderBottomColor = "transparent";
        arrowEl.style.borderLeftColor = currentPlacement.startsWith("left") ? "#1f2937" : "transparent";
        arrowEl.style.borderRightColor = currentPlacement.startsWith("right") ? "#1f2937" : "transparent";
      } else {
        arrowEl.style.left = `${result.arrowX}px`;
        arrowEl.style.top = `${result.arrowY}px`;
        arrowEl.style.borderLeftColor = "transparent";
        arrowEl.style.borderRightColor = "transparent";
        arrowEl.style borderTopColor = currentPlacement.startsWith("top") ? "#1f2937" : "transparent";
        arrowEl.style.borderBottomColor = currentPlacement.startsWith("bottom") ? "#1f2937" : "transparent";
      }
    }
  }

  function doShow(): void {
    if (destroyed || visible) return;

    // Handle groups
    if (opts.group) {
      const existing = activeGroups.get(opts.group);
      if (existing && existing !== instance) existing.hide();
      activeGroups.set(opts.group, instance);
    }

    // Make visible briefly to measure
    el.style.visibility = "hidden";
    el.style.opacity = "1";
    el.style.pointerEvents = "auto";

    const pos = calculatePosition();
    applyPosition(pos);

    el.style.visibility = "visible";
    el.style.transform = "scale(0.96)";
    requestAnimationFrame(() => {
      el.style.transform = "scale(1)";
    });

    visible = true;
    opts.onShow?.();
  }

  function doHide(): void {
    if (destroyed || !visible) return;

    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    el.style.transform = "scale(0.96)";

    setTimeout(() => {
      if (!visible) el.style.display = "none";
    }, opts.animationDuration);

    visible = false;
    opts.onHide?.();

    if (opts.group && activeGroups.get(opts.group) === instance) {
      activeGroups.delete(opts.group);
    }
  }

  // --- Event Handlers ---

  const hasTrigger = (...modes: TriggerMode[]) =>
    modes.some((m) => opts.trigger.includes(m));

  if (hasTrigger("hover")) {
    anchor.addEventListener("mouseenter", () => {
      clearTimeout(hideTimer!);
      showTimer = setTimeout(doShow, opts.showDelay);
    });
    anchor.addEventListener("mouseleave", () => {
      clearTimeout(showTimer!);
      hideTimer = setTimeout(doHide, opts.hideDelay);
    });
    // Don't hide when moving mouse into tooltip
    el.addEventListener("mouseenter", () => { clearTimeout(hideTimer!); });
    el.addEventListener("mouseleave", () => { hideTimer = setTimeout(doHide, opts.hideDelay); });
  }

  if (hasTrigger("click")) {
    anchor.addEventListener("click", (e) => {
      e.stopPropagation();
      if (visible) doHide(); else doShow();
    });
  }

  if (hasTrigger("focus")) {
    anchor.addEventListener("focus", () => { clearTimeout(hideTimer!); doShow(); });
    anchor.addEventListener("blur", () => { hideTimer = setTimeout(doHide, opts.hideDelay); });
  }

  // Close on outside click (for click-triggered)
  document.addEventListener("mousedown", (e) => {
    if (hasTrigger("click") && visible && !el.contains(e.target as Node) && !anchor.contains(e.target as Node)) {
      doHide();
    }
  });

  // Escape key closes
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape" && visible) doHide();
  };
  document.addEventListener("keydown", escHandler);

  const instance: TooltipInstance = {
    element: el,

    show() { clearTimeout(hideTimer!); doShow(); },
    hide() { clearTimeout(showTimer!); doHide(); },

    toggle() { visible ? doHide() : doShow(); },

    isVisible() { return visible; },

    setContent(content: string | HTMLElement) {
      setContent(contentWrap, content);
      if (visible) updatePosition();
    },

    setPlacement(placement: Placement) {
      currentPlacement = placement;
      if (visible) updatePosition();
    },

    updatePosition() {
      const pos = calculatePosition();
      applyPosition(pos);
    },

    destroy() {
      destroyed = true;
      clearTimeout(showTimer!);
      clearTimeout(hideTimer!);
      document.removeEventListener("keydown", escHandler);
      el.remove();
      if (opts.group && activeGroups.get(opts.group) === instance) {
        activeGroups.delete(opts.group);
      }
    },
  };

  return instance;
}

// --- Popover Factory ---

export function createPopover(options: PopoverOptions): TooltipInstance {
  const popoverContent = document.createElement("div");
  popoverContent.className = "popover-content";
  popoverContent.style.cssText = `
    display:flex;flex-direction:column;background:#fff;border-radius:10px;
    box-shadow:0 8px 32px rgba(0,0,0,0.14),0 0 1px rgba(0,0,0,0.06);
    border:1px solid #e5e7eb;overflow:hidden;
    width:${options.width ?? 320}px;
    ${options.maxHeight ? `max-height:${options.maxHeight};overflow-y:auto;` : ""}
  `;

  // Header
  if (options.title || options.closable !== false) {
    const header = document.createElement("div");
    header.className = "popover-header";
    header.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;font-weight:600;color:#111827;";
    if (options.title) {
      const titleSpan = document.createElement("span");
      titleSpan.textContent = options.title;
      header.appendChild(titleSpan);
    } else {
      header.appendChild(document.createElement("span"));
    }

    if (options.closable !== false) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "&times;";
      closeBtn.setAttribute("aria-label", "Close popover");
      closeBtn.style.cssText = "background:none;border:none;cursor:pointer;font-size:16px;color:#9ca3af;padding:2px 6px;border-radius:4px;line-height:1;";
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#f3f4f6"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; });
      header.appendChild(closeBtn);
    }

    popoverContent.appendChild(header);
  }

  // Body
  const bodyWrap = document.createElement("div");
  bodyWrap.className = "popover-body";
  bodyWrap.style.cssText = "padding:16px;font-size:13px;color:#374151;line-height:1.5;";
  if (typeof options.body === "string") bodyWrap.innerHTML = options.body;
  else bodyWrap.appendChild(options.body);
  popoverContent.appendChild(bodyWrap);

  // Footer
  if (options.footer) {
    const footer = document.createElement("div");
    footer.className = "popover-footer";
    footer.style.cssText = "padding:12px 16px;border-top:1px solid #f0f0f0;display:flex;justify-content:flex-end;gap:8px;";
    if (typeof options.footer === "string") footer.innerHTML = options.footer;
    else footer.appendChild(options.footer);
    popoverContent.appendChild(footer);
  }

  // Create tooltip with popover content
  const tooltipInstance = createTooltip({
    ...options,
    content: popoverContent,
    arrow: options.arrow ?? false,
    maxWidth: typeof options.width === "number" ? options.width : 400,
  });

  // Override content setter to update body
  const originalSetContent = tooltipInstance.setContent;
  tooltipInstance.setContent = (content: string | HTMLElement) => {
    bodyWrap.innerHTML = "";
    if (typeof content === "string") bodyWrap.innerHTML = content;
    else bodyWrap.appendChild(content);
    if (tooltipInstance.isVisible()) tooltipInstance.updatePosition();
  };

  // Wire up close button
  if (options.closable !== false) {
    const closeBtn = popoverContent.querySelector(".popover-header button");
    if (closeBtn) closeBtn.addEventListener("click", () => tooltipInstance.hide());
  }

  return tooltipInstance;
}
