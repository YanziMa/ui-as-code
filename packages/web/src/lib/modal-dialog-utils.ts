/**
 * Modal Dialog Utilities: Full-featured modal dialog with header, body,
 * footer, sizing variants, scrollable content, focus trap, backdrop, and
 * responsive behavior.
 */

// --- Types ---

export type ModalSize = "xs" | "sm" | "md" | "lg" | "xl" | "full";
export type ModalVariant = "default" | "borderless" | "minimal";

export interface ModalHeaderOptions {
  /** Title text */
  title: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Icon HTML */
  icon?: string;
  /** Show close button */
  showClose?: boolean;
  /** Custom header actions (HTMLElement array) */
  actions?: HTMLElement[];
}

export interface ModalFooterButton {
  /** Label */
  label: string;
  /** Variant */
  variant?: "primary" | "secondary" | "ghost" | "danger" | "text";
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Click handler */
  onClick?: () => void | Promise<void>;
}

export interface ModalOptions {
  /** Header config */
  header?: ModalHeaderOptions;
  /** Body content (HTML string or element) */
  body: string | HTMLElement;
  /** Footer buttons */
  footer?: ModalFooterButton[];
  /** Size variant */
  size?: ModalSize;
  /** Visual style variant */
  variant?: ModalVariant;
  /** Custom width (overrides size) */
  width?: number | string;
  /** Max height of body before scrolling */
  maxHeight?: number | string;
  /** Show backdrop overlay */
  backdrop?: boolean;
  /** Backdrop color */
  backdropColor?: string;
  /** Click outside to close */
  closeOnOutside?: boolean;
  /** Escape to close */
  closeOnEscape?: true;
  /** Center vertically (default true) */
  centered?: boolean;
  /** Scroll lock when open */
  lockScroll?: boolean;
  /** Z-index */
  zIndex?: number;
  /** Open/close animation duration (ms) */
  animationDuration?: number;
  /** Container element */
  container?: HTMLElement;
  /** Called when opened */
  onOpen?: () => void;
  /** Called when closed */
  onClose?: () => void;
  /** Custom class name */
  className?: string;
}

export interface ModalInstance {
  /** Root element (overlay wrapper) */
  el: HTMLElement;
  /** The inner panel element */
  panel: HTMLElement;
  /** Open the modal */
  open: () => void;
  /** Close the modal */
  close: () => void;
  /** Toggle */
  toggle: () => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Update body content */
  setBody: (content: string | HTMLElement) => void;
  /** Update header */
  setHeader: (header: ModalHeaderOptions) => void;
  /** Update footer buttons */
  setFooter: (buttons: ModalFooterButton[]) => void;
  /** Set loading state on a button by index */
  setButtonLoading: (index: number, loading: boolean) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Size Config ---

const MODAL_SIZES: Record<ModalSize, {
  width: string; borderRadius: string; padding: string; headerFontSize: string;
}> = {
  xs: { width: "320px", borderRadius: "10px", padding: "16px", headerFontSize: "15px" },
  sm: { width: "400px", borderRadius: "12px", padding: "20px", headerFontSize: "16px" },
  md: { width: "520px", borderRadius: "14px", padding: "24px", headerFontSize: "17px" },
  lg: { width: "680px", borderRadius: "16px", padding: "28px", headerFontSize: "18px" },
  xl: { width: "840px", borderRadius: "18px", padding: "32px", headerFontSize: "19px" },
  full: { width: "95vw", borderRadius: "16px", padding: "32px", headerFontSize: "19px" },
};

// --- Core Factory ---

/**
 * Create a full modal dialog.
 *
 * @example
 * ```ts
 * const modal = createModal({
 *   header: { title: "Edit Profile", showClose: true },
 *   body: formElement,
 *   footer: [
 *     { label: "Cancel", variant: "secondary", onClick: () => modal.close() },
 *     { label: "Save Changes", variant: "primary", onClick: () => save() },
 *   ],
 * });
 * modal.open();
 * ```
 */
export function createModal(options: ModalOptions): ModalInstance {
  const {
    header,
    body,
    footer = [],
    size = "md",
    variant = "default",
    width,
    maxHeight,
    backdrop = true,
    backdropColor = "rgba(0,0,0,0.5)",
    closeOnOutside = true,
    closeOnEscape = true,
    centered = true,
    lockScroll = true,
    zIndex = 1050,
    animationDuration = 200,
    container,
    onOpen,
    onClose,
    className,
  } = options;

  let _open = false;
  let cleanupFns: Array<() => void> = [];
  let unlockFn: (() => void) | null = null;
  let _footerButtons: ModalFooterButton[] = [...footer];
  let _headerConfig: ModalHeaderOptions | undefined = header;

  const ms = MODAL_SIZES[size];

  // Overlay
  const overlay = document.createElement("div");
  overlay.className = `modal-overlay ${variant} ${className ?? ""}`.trim();
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:auto;display:none;" +
    `z-index:${zIndex};align-items:center;justify-content:center;` +
    "padding:16px;";

  // Backdrop
  const backdropEl = document.createElement("div");
  backdropEl.className = "modal-backdrop";
  backdropEl.style.cssText =
    "position:absolute;inset:0;background:" + backdropColor + ";transition:opacity 0.2s ease;opacity:0;pointer-events:none;";
  if (backdrop) overlay.appendChild(backdropEl);

  // Panel
  const panel = document.createElement("div");
  panel.className = "modal-panel";
  panel.style.cssText =
    `background:#fff;width:${width ?? ms.width};max-height:${maxHeight ?? "70vh"};` +
    `border-radius:${ms.borderRadius};box-shadow:0 24px 64px rgba(0,0,0,0.22);` +
    "display:flex;flex-direction:column;overflow:hidden;" +
    (variant === "borderless" ? "" : "border:1px solid #e5e7eb;") +
    (variant === "minimal" ? "padding:0;" : "") +
    "animation:modal-scale-in 0.18s cubic-bezier(0.16,1,0.3,1);transform-origin:center;";

  // Build header
  let headerEl: HTMLElement | null = null;
  let closeBtn: HTMLElement | null = null;

  function buildHeader(cfg: ModalHeaderOptions): void {
    if (headerEl) headerEl.remove();
    headerEl = document.createElement("div");
    headerEl.className = "modal-header";
    headerEl.style.cssText =
      "display:flex;align-items:flex-start;justify-content:space-between;" +
      `gap:12px;padding:${ms.padding.split(" ")[0]} ${ms.padding.split(" ")[1]};` +
      "flex-shrink:0;min-height:32px;";

    const left = document.createElement("div");
    left.style.cssText = "display:flex;align-items:center;gap:10px;flex:1;min-width:0;";

    if (cfg.icon) {
      const ic = document.createElement("span");
      ic.innerHTML = cfg.icon;
      ic.style.cssText = "display:flex;align-items:center;font-size:18px;color:#6b7280;flex-shrink:0;";
      left.appendChild(ic);
    }

    const titleArea = document.createElement("div");
    const t = document.createElement("h2");
    t.textContent = cfg.title;
    t.style.cssText =
      `margin:0;font-size:${ms.headerFontSize};font-weight:600;color:#111827;line-height:1.3;`;
    titleArea.appendChild(t);

    if (cfg.subtitle) {
      const sub = document.createElement("p");
      sub.textContent = cfg.subtitle;
      sub.style.cssText = "margin:2px 0 0;font-size:12px;color:#9ca3af;";
      titleArea.appendChild(sub);
    }

    left.appendChild(titleArea);
    headerEl.appendChild(left);

    // Right side: actions + close button
    const right = document.createElement("div");
    right.style.cssText = "display:flex;align-items:center;gap:6px;flex-shrink:0;";

    if (cfg.actions) {
      for (const act of cfg.actions) right.appendChild(act.cloneNode(true));
    }

    if (cfg.showClose !== false) {
      closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "&times;";
      closeBtn.setAttribute("aria-label", "Close modal");
      closeBtn.style.cssText =
        "display:flex;align-items:center;justify-content:center;width:28px;height:28px;" +
        "border:1px solid #e5e7eb;border-radius:6px;background:#fff;" +
        "font-size:16px;color:#6b7280;cursor:pointer;transition:all 0.12s;";
      closeBtn.addEventListener("mouseenter", () => { closeBtn!.style.borderColor = "#d1d5db"; closeBtn!.style.color = "#374151"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn!.style.borderColor = "#e5e7eb"; closeBtn!.style.color = "#6b7280"; });
      closeBtn.addEventListener("click", close);
      right.appendChild(closeBtn);
    }

    headerEl.appendChild(right);
    panel.insertBefore(headerEl, panel.firstChild);
  }

  if (_headerConfig) buildHeader(_headerConfig);

  // Body
  const bodyEl = document.createElement("div");
  bodyEl.className = "modal-body";
  bodyEl.style.cssText =
    "flex:1;overflow-y:auto;padding:0 " + (variant === "minimal" ? "" : ` ${ms.padding.split(" ")[1]}`);
  if (typeof body === "string") bodyEl.innerHTML = body;
  else bodyEl.appendChild(body.cloneNode(true));
  panel.appendChild(bodyEl);

  // Footer
  let footerEl: HTMLElement | null = null;

  function buildFooter(btns: ModalFooterButton[]): void {
    if (footerEl) footerEl.remove();
    if (!btns.length) return;

    footerEl = document.createElement("div");
    footerEl.className = "modal-footer";
    footerEl.style.cssText =
      `display:flex;gap:8px;justify-content:flex-end;padding:${ms.padding.split(" ")[0]} ${ms.padding.split(" ")[1]};` +
      "border-top:1px solid #f3f4f6;flex-shrink:0;";

    for (const btn of btns) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = btn.label;
      b.disabled = !!btn.disabled || !!btn.loading;

      const baseStyle =
        "padding:8px 18px;border-radius:8px;font-size:13px;font-weight:500;" +
        "cursor:pointer;transition:all 0.15s;";

      switch (btn.variant ?? "secondary") {
        case "primary": b.style.cssText = baseStyle + "background:#3b82f6;color:#fff;border:none;"; break;
        case "ghost": b.style.cssStyle = baseStyle + "background:transparent;color:#3b82f6;border:1px solid #d1d5db;"; break;
        case "danger": b.style.cssStyle = baseStyle + "background:#fef2f2;color:#dc2626;border:1px solid #fecaca;"; break;
        case "text": b.style.cssStyle = baseStyle + "background:transparent;color:#6b7280;border:none;"; break;
        default: b.style.cssText = baseStyle + "background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;";
      }

      if (btn.loading) {
        b.style.opacity = "0.6";
        b.style.cursor = "wait";
      }

      b.addEventListener("click", async () => {
        if (btn.disabled || btn.loading) return;
        try { await btn.onClick?.(); } catch {}
        // Don't auto-close on non-primary buttons
      });

      footerEl.appendChild(b);
    }

    panel.appendChild(footerEl);
  }

  buildFooter(_footerButtons);

  overlay.appendChild(panel);

  // Keyframes
  if (!document.getElementById("modal-keyframes")) {
    const ks = document.createElement("style");
    ks.id = "modal-keyframes";
    ks.textContent =
      "@keyframes modal-scale-in{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}" +
      "@keyframes modal-scale-out{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(0.96)}}";
    document.head.appendChild(ks);
  }

  (container ?? document.body).appendChild(overlay);

  // --- Focus Trap ---

  function _trapFocus(): void {
    const focusables = panel.querySelectorAll<HTMLElement>(
      'button,[tabindex]:not([tabindex="-1"]):not([disabled])'
    );
    if (focusables.length > 0) (focusables[0] as HTMLElement).focus();

    const handler = (e: KeyboardEvent): void => {
      if (e.key === "Tab") {
        e.preventDefault();
        const els = Array.from(focusables) as HTMLElement[];
        const curIdx = els.indexOf(document.activeElement as HTMLElement);
        const nextIdx = e.shiftKey ? (curIdx - 1 + els.length) % els.length : (curIdx + 1) % els.length;
        els[nextIdx]?.focus();
      }
    };

    panel.addEventListener("keydown", handler);
    cleanupFns.push(() => panel.removeEventListener("keydown", handler));
  }

  // --- Methods ---

  function open(): void {
    if (_open) return;
    _open = true;
    overlay.style.display = "";

    if (lockScroll) unlockFn = _lockScroll();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.style.animation = "";
        _trapFocus();
      });
    });

    setupListeners();
    onOpen?.();
  }

  function close(): void {
    if (!_open) return;
    panel.style.animation = "modal-scale-out 0.15s ease forwards";

    setTimeout(() => {
      _open = false;
      overlay.style.display = "none";
      removeListeners();
      unlockFn?.();
      unlockFn = null;
      onClose?.();
    }, animationDuration);
  }

  function toggle(): void { _open ? close() : open(); }
  function isOpen(): boolean { return _open; }

  function setBody(content: string | HTMLElement): void {
    bodyEl.innerHTML = "";
    if (typeof content === "string") bodyEl.innerHTML = content;
    else bodyEl.appendChild(content.cloneNode(true));
  }

  function setHeader(cfg: ModalHeaderOptions): void {
    _headerConfig = cfg;
    buildHeader(cfg);
  }

  function setButtons(btns: ModalFooterButton[]): void {
    _footerButtons = btns;
    buildFooter(btns);
  }

  function setButtonLoading(index: number, loading: boolean): void {
    const btns = footerEl?.querySelectorAll("button");
    if (btns && btns[index]) {
      btns[index].disabled = loading;
      btns[index].style.opacity = loading ? "0.6" : "";
      btns[index].style.cursor = loading ? "wait" : "pointer";
    }
  }

  function destroy(): void {
    if (_open) {
      _open = false;
      overlay.style.display = "";
    }
    removeListeners();
    unlockFn?.();
    overlay.remove();
  }

  // --- Listeners ---

  function setupListeners(): void {
    removeListeners();
    if (closeOnOutside && backdropEl) {
      backdropEl.addEventListener("click", close);
      cleanupFns.push(() => backdropEl!.removeEventListener("click", close));
    }
    if (closeOnEscape) {
      const h = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
      document.addEventListener("keydown", h);
      cleanupFns.push(() => document.removeEventListener("keydown", h));
    }
  }

  function removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return {
    el: overlay,
    panel,
    open, close, toggle, isOpen,
    setBody, setHeader, setFooter, setButtonLoading,
    destroy,
  };
}

/** Simple scroll lock helper */
function _lockScroll(): () => void {
  const body = document.body;
  const origOverflow = body.style.overflow;
  const origPR = body.style.paddingRight;
  const sbW = window.innerWidth - document.documentElement.clientWidth;
  body.style.overflow = "hidden";
  if (sbW > 0) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight || "0") + sbW}px`;
  return () => { body.style.overflow = origOverflow; body.style.paddingRight = origPR; };
}
