/**
 * Popconfirm Utilities: Popover confirmation pattern with configurable
 * triggers, icon variants, async confirmation, keyboard support,
 * positioning, and loading states.
 */

// --- Types ---

export type PopconfirmPlacement = "top" | "bottom" | "left" | "right";
export type PopconfirmTrigger = "click" | "hover" | "focus" | "manual";
export type PopconfirmIconType = "warning" | "danger" | "info" | "question" | "none";

export interface PopconfirmOptions {
  /** Target element to attach the popconfirm to */
  target: HTMLElement;
  /** Confirmation title */
  title: string;
  /** Description text below title */
  description?: string;
  /** Placement of popover relative to target */
  placement?: PopconfirmPlacement;
  /** How to trigger showing */
  trigger?: PopconfirmTrigger;
  /** Icon type in popover header */
  iconType?: PopconfirmIconType;
  /** Custom icon HTML string */
  customIcon?: string;
  /** Confirm button text. Default "OK" */
  okText?: string;
  /** Cancel button text. Default "Cancel" */
  cancelText?: string;
  /** Danger style for confirm button? */
  okDanger?: boolean;
  /** Show arrow on popover */
  showArrow?: boolean;
  /** Show cancel button? Default true */
  showCancel?: boolean;
  /** Delay before showing on hover (ms). Default 150 */
  showDelay?: number;
  /** Delay before hiding on hover leave (ms). Default 100 */
  hideDelay?: number;
  /** Offset from target (px). Default 8 */
  offset?: number;
  /** Z-index */
  zIndex?: number;
  /** Custom class name */
  className?: string;
  /** Width of popover (px or CSS value) */
  width?: number | string;
  /** Async confirm handler (shows loading while pending) */
  onConfirm?: () => boolean | void | Promise<boolean> | Promise<void>;
  /** Called when cancelled */
  onCancel?: () => void;
  /** Called when popover shows */
  onOpen?: () => void;
  /** Called when popover hides */
  onClose?: () => void;
}

export interface PopconfirmInstance {
  /** The popover element */
  el: HTMLElement;
  /** Show the popconfirm */
  show: () => void;
  /** Hide the popconfirm */
  hide: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Update title */
  setTitle: (title: string) => void;
  /** Update description */
  setDescription: (desc: string) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Icon Map ---

const ICON_MAP: Record<PopconfirmIconType, string> = {
  "warning": "&#9888;",
  "danger": "&#10006;",
  "info": "&#8505;",
  "question": "&#63;",
  "none": "",
};

const ICON_STYLES: Record<PopconfirmIconType, string> = {
  "warning": "background:#fef3c7;color:#d97706;",
  "danger": "background:#fee2e2;color:#dc2626;",
  "info": "background:#dbeafe;color:#2563eb;",
  "question": "background:#f3f4f6;color:#374151;",
  "none": "",
};

// --- Core Factory ---

/**
 * Create a popover confirmation attached to a target element.
 *
 * @example
 * ```ts
 * const pc = createPopconfirm({
 *   target: deleteBtn,
 *   title: "Delete this item?",
 *   description: "This action cannot be undone.",
 *   okDanger: true,
 *   onConfirm: async () => { await api.delete(); },
 * });
 * ```
 */
export function createPopconfirm(options: PopconfirmOptions): PopconfirmInstance {
  const {
    target,
    title,
    description,
    placement = "top",
    trigger = "click",
    iconType = "warning",
    customIcon,
    okText = "OK",
    cancelText = "Cancel",
    okDanger = false,
    showArrow = true,
    showCancel = true,
    showDelay = 150,
    hideDelay = 100,
    offset = 8,
    zIndex = 1060,
    className,
    width = 280,
    onConfirm,
    onCancel,
    onOpen,
    onClose,
  } = options;

  let _visible = false;
  let _loading = false;
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  const cleanupFns: Array<() => void> = [];

  // Popover container
  const popover = document.createElement("div");
  popover.className = `popconfirm ${className ?? ""}`.trim();
  popover.style.cssText =
    "position:absolute;display:none;z-index:" + zIndex + ";";

  // Arrow
  let arrowEl: HTMLElement | null = null;
  if (showArrow) {
    arrowEl = document.createElement("div");
    arrowEl.className = "popconfirm-arrow";
    arrowEl.style.cssText = "position:absolute;width:0;height:0;";
    popover.appendChild(arrowEl);
  }

  // Content box
  const box = document.createElement("div");
  box.className = "popconfirm-box";
  const w = typeof width === "number" ? `${width}px` : width;
  box.style.cssText =
    `width:${w};background:#fff;border:1px solid #e5e7eb;` +
    "border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,0.12);" +
    "padding:14px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;" +
    "font-size:13px;line-height:1.5;";

  // Inner content
  const inner = document.createElement("div");
  inner.className = "popconfirm-inner";
  inner.style.display = "flex";
  inner.style.gap = "10px";
  inner.style.alignItems = "flex-start";

  // Icon
  if (iconType !== "none") {
    const iconWrap = document.createElement("span");
    iconWrap.className = "popconfirm-icon";
    iconWrap.innerHTML = customIcon ?? ICON_MAP[iconType];
    iconWrap.style.cssText =
      `display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;` +
      `border-radius:50%;font-size:12px;flex-shrink:0;margin-top:1px;${ICON_STYLES[iconType]}`;
    inner.appendChild(iconWrap);
  }

  // Text area
  const textArea = document.createElement("div");
  textArea.className = "popconfirm-text";

  const titleEl = document.createElement("div");
  titleEl.className = "popconfirm-title";
  titleEl.textContent = title;
  titleEl.style.fontWeight = "600";
  titleEl.style.color = "#111827";
  titleEl.style.marginBottom = description ? "2px" : "0";
  textArea.appendChild(titleEl);

  if (description) {
    const descEl = document.createElement("div");
    descEl.className = "popconfirm-description";
    descEl.textContent = description;
    descEl.style.color = "#6b7280";
    descEl.style.fontSize = "12px";
    textArea.appendChild(descEl);
  }

  inner.appendChild(textArea);
  box.appendChild(inner);

  // Buttons
  const btnRow = document.createElement("div");
  btnRow.className = "popconfirm-buttons";
  btnRow.style.cssText =
    "display:flex;align-items:center;justify-content:flex-end;gap:6px;" +
    "margin-top:10px;";

  if (showCancel) {
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = cancelText;
    cancelBtn.style.cssText =
      "padding:4px 12px;border-radius:6px;font-size:12px;border:none;" +
      "background:#f3f4f6;color:#374151;cursor:pointer;font-weight:500;" +
      "transition:background 0.12s;";
    cancelBtn.addEventListener("mouseenter", () => { cancelBtn.style.background = "#e5e7eb"; });
    cancelBtn.addEventListener("mouseleave", () => { cancelBtn.style.background = ""; });
    cancelBtn.addEventListener("click", handleCancel);
    btnRow.appendChild(cancelBtn);
  }

  const okBtn = document.createElement("button");
  okBtn.type = "button";
  okBtn.textContent = okText;
  okBtn.style.cssText =
    "padding:4px 12px;border-radius:6px;font-size:12px;border:none;" +
    "cursor:pointer;font-weight:500;transition:all 0.12s;" +
    (okDanger
      ? "background:#dc2626;color:#fff;"
      : "background:#3b82f6;color:#fff;");
  okBtn.addEventListener("mouseenter", () => {
    okBtn.style.transform = "scale(1.03)";
    okBtn.style.background = okDanger ? "#b91c1c" : "#2563eb";
  });
  okBtn.addEventListener("mouseleave", () => {
    okBtn.style.transform = "";
    okBtn.style.background = okDanger ? "#dc2626" : "#3b82f6";
  });
  okBtn.addEventListener("click", handleConfirm);
  btnRow.appendChild(okBtn);

  box.appendChild(btnRow);
  popover.appendChild(box);
  document.body.appendChild(popover);

  // --- Positioning ---

  function position(): void {
    const rect = target.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const pw = typeof width === "number" ? width : parseFloat(String(width)) || 280;
    const ph = popover.offsetHeight || 100;

    let top = 0;
    let left = 0;

    switch (placement) {
      case "top":
        top = rect.top - ph - offset;
        left = rect.left + (rect.width - pw) / 2;
        break;
      case "bottom":
        top = rect.bottom + offset;
        left = rect.left + (rect.width - pw) / 2;
        break;
      case "left":
        top = rect.top + (rect.height - ph) / 2;
        left = rect.left - pw - offset;
        break;
      case "right":
        top = rect.top + (rect.height - ph) / 2;
        left = rect.right + offset;
        break;
    }

    // Boundary clamping
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    left = Math.max(4, Math.min(left, viewW - pw - 4));
    top = Math.max(4, Math.min(top, viewH - ph - 4));

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;

    // Position arrow
    if (arrowEl) {
      const arrowSize = 6;
      const color = "#fff";
      const borderColor = "#e5e7eb";

      // Position arrow at edge pointing toward target center
      const targetCenterX = rect.left + rect.width / 2;
      const targetCenterY = rect.top + rect.height / 2;

      switch (placement) {
        case "top":
          Object.assign(arrowEl.style, {
            bottom: `-${arrowSize}px`,
            left: `${targetCenterX - left - arrowSize}px`,
            borderLeft: `${arrowSize}px solid transparent`,
            borderRight: `${arrowSize}px solid transparent`,
            borderTop: `${arrowSize}px solid ${color}`,
          });
          break;
        case "bottom":
          Object.assign(arrowEl.style, {
            top: `-${arrowSize}px`,
            left: `${targetCenterX - left - arrowSize}px`,
            borderLeft: `${arrowSize}px solid transparent`,
            borderRight: `${arrowSize}px solid transparent`,
            borderBottom: `${arrowSize}px solid ${color}`,
          });
          break;
        case "left":
          Object.assign(arrowEl.style, {
            right: `-${arrowSize}px`,
            top: `${targetCenterY - top - arrowSize}px`,
            borderTop: `${arrowSize}px solid transparent`,
            borderBottom: `${arrowSize}px solid transparent`,
            borderLeft: `${arrowSize}px solid ${color}`,
          });
          break;
        case "right":
          Object.assign(arrowEl.style, {
            left: `-${arrowSize}px`,
            top: `${targetCenterY - top - arrowSize}px`,
            borderTop: `${arrowSize}px solid transparent`,
            borderBottom: `${arrowSize}px solid transparent`,
            borderRight: `${arrowSize}px solid ${color}`,
          });
          break;
      }
    }
  }

  // --- Show / Hide ---

  function show(): void {
    if (_visible || _loading) return;
    clearTimeout(hideTimer!);
    hideTimer = null;

    if (trigger === "hover") {
      showTimer = setTimeout(() => doShow(), showDelay);
    } else {
      doShow();
    }
  }

  function doShow(): void {
    _visible = true;
    position();
    popover.style.display = "";
    popover.style.opacity = "0";
    popover.style.transform = placement === "top" || placement === "bottom"
      ? "translateY(4px)"
      : "translateX(4px)";
    popover.style.transition = "opacity 0.15s ease, transform 0.15s ease";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        popover.style.opacity = "1";
        popover.style.transform = "translateY(0) translateX(0)";
      });
    });

    onOpen?.();

    // Click outside to close
    const clickOutsideHandler = (e: MouseEvent) => {
      if (!popover.contains(e.target as Node) && !target.contains(e.target as Node)) {
        hide();
      }
    };
    setTimeout(() => {
      document.addEventListener("click", clickOutsideHandler);
      cleanupFns.push(() => document.removeEventListener("click", clickOutsideHandler));
    }, 0);
  }

  function hide(): void {
    if (!_visible || _loading) return;
    clearTimeout(showTimer!);
    showTimer = null;

    if (trigger === "hover") {
      hideTimer = setTimeout(doHide, hideDelay);
    } else {
      doHide();
    }
  }

  function doHide(): void {
    _visible = false;
    popover.style.opacity = "0";
    popover.style.transform = placement === "top" || placement === "bottom"
      ? "translateY(4px)"
      : "translateX(4px)";

    setTimeout(() => {
      popover.style.display = "none";
      // Remove click-outside listener
      for (let i = cleanupFns.length - 1; i >= 0; i--) {
        const fn = cleanupFns[i];
        if (fn) fn();
        cleanupFns.splice(i, 1);
      }
      onClose?.();
    }, 150);
  }

  function toggle(): void { _visible ? hide() : show(); }
  function isVisible(): boolean { return _visible; }

  // --- Handlers ---

  async function handleConfirm(): Promise<void> {
    if (_loading) return;
    _loading = true;

    // Show loading state on button
    okBtn.disabled = true;
    okBtn.textContent = "...";
    okBtn.style.opacity = "0.6";

    try {
      const result = onConfirm?.();
      const resolved = result instanceof Promise ? await result : result;

      // If handler returned false, don't close
      if (resolved === false) {
        _loading = false;
        okBtn.disabled = false;
        okBtn.textContent = okText;
        okBtn.style.opacity = "1";
        return;
      }

      hide();
    } catch {
      // On error, keep open but reset button
      _loading = false;
      okBtn.disabled = false;
      okBtn.textContent = okText;
      okBtn.style.opacity = "1";
    }
  }

  function handleCancel(): void {
    onCancel?.();
    hide();
  }

  // --- Trigger Setup ---

  function setupTriggers(): void {
    switch (trigger) {
      case "click":
        target.addEventListener("click", toggle);
        cleanupFns.push(() => target.removeEventListener("click", toggle));
        break;

      case "hover": {
        target.addEventListener("mouseenter", show);
        target.addEventListener("mouseleave", hide);
        popover.addEventListener("mouseenter", () => { clearTimeout(hideTimer!); hideTimer = null; });
        popover.addEventListener("mouseleave", hide);
        cleanupFns.push(
          () => target.removeEventListener("mouseenter", show),
          () => target.removeEventListener("mouseleave", hide),
          () => popover.removeEventListener("mouseenter", () => {}),
          () => popover.removeEventListener("mouseleave", hide),
        );
        break;
      }

      case "focus":
        target.addEventListener("focusin", show);
        target.addEventListener("focusout", (e) => {
          // Don't hide if focus moved inside popover
          if (!popover.contains(e.relatedTarget as Node)) hide();
        });
        cleanupFns.push(
          () => target.removeEventListener("focusin", show),
          () => target.removeEventListener("focusout", hide as (e: FocusEvent) => void),
        );
        break;

      case "manual":
        // User controls via show()/hide()
        break;
    }

    // Escape key closes
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && _visible && !_loading) hide();
    };
    document.addEventListener("keydown", escHandler);
    cleanupFns.push(() => document.removeEventListener("keydown", escHandler));

    // Reposition on scroll/resize
    const repositionHandler = () => { if (_visible) position(); };
    window.addEventListener("scroll", repositionHandler, true);
    window.addEventListener("resize", repositionHandler);
    cleanupFns.push(
      () => window.removeEventListener("scroll", repositionHandler, true),
      () => window.removeEventListener("resize", repositionHandler),
    );
  }

  setupTriggers();

  // --- API Methods ---

  function setTitle(t: string): void {
    titleEl.textContent = t;
  }

  function setDescription(d: string): void {
    const descEl = textArea.querySelector(".popconfirm-description");
    if (descEl) {
      descEl.textContent = d;
      descEl.style.display = d ? "" : "none";
    } else if (d) {
      const newDesc = document.createElement("div");
      newDesc.className = "popconfirm-description";
      newDesc.textContent = d;
      newDesc.style.color = "#6b7280";
      newDesc.style.fontSize = "12px";
      textArea.appendChild(newDesc);
      titleEl.style.marginBottom = "2px";
    }
  }

  function destroy(): void {
    hide();
    setTimeout(() => {
      for (const fn of cleanupFns) fn();
      cleanupFns.length = 0;
      popover.remove();
    }, 200);
  }

  return { el: popover, show, hide, toggle, isVisible, setTitle, setDescription, destroy };
}
