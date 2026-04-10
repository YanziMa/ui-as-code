/**
 * Side Sheet / Panel: Slide-in panel from left/right/bottom/top with
 * overlay, drag-to-resize, header/footer slots, size variants,
 * keyboard escape to close, body scroll lock, and animations.
 */

// --- Types ---

export type SheetSide = "left" | "right" | "top" | "bottom";
export type SheetSize = "sm" | "md" | "lg" | "xl" | "full";

export interface SheetOptions {
  /** Parent element or selector */
  parent?: HTMLElement | string;
  /** Which side the sheet slides in from */
  side?: SheetSide;
  /** Size variant */
  size?: SheetSize;
  /** Width/height (CSS value, overrides size) */
  width?: string | number;
  /** Height for top/bottom sheets */
  height?: string | number;
  /** Title text */
  title?: string;
  /** Header content (string or HTMLElement) */
  header?: string | HTMLElement;
  /** Body content (string or HTMLElement) */
  body?: string | HTMLElement;
  /** Footer content (string or HTMLElement) */
  footer?: string | HTMLElement;
  /** Show close button? */
  closable?: boolean;
  /** Show overlay/backdrop? */
  showOverlay?: boolean;
  /** Close on overlay click? */
  closeOnOverlayClick?: boolean;
  /** Animation duration in ms (default: 280) */
  animationDuration?: number;
  /** Easing function */
  easing?: string;
  /** Allow drag to resize edge? */
  resizable?: boolean;
  /** Callback on open */
  onOpen?: () => void;
  /** Callback on close */
  onClose?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface SheetInstance {
  element: HTMLDivElement;
  overlay: HTMLDivElement | null;
  isOpen: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setBody: (content: string | HTMLElement) => void;
  setTitle: (title: string) => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_MAP: Record<SheetSide, Record<SheetSize, string>> = {
  left:   { sm: "280px", md: "384px", lg: "480px", xl: "640px", full: "100%" },
  right:  { sm: "280px", md: "384px", lg: "480px", xl: "640px", full: "100%" },
  top:    { sm: "200px", md: "300px", lg: "400px", xl: "500px", full: "100vh" },
  bottom: { sm: "200px", md: "300px", lg: "400px", xl: "500px", full: "100vh" },
};

const SIDE_PROPS: Record<SheetSide, { translateIn: string; translateOut: string; dim: string }> = {
  left:   { translateIn: "translateX(0)",   translateOut: "translateX(-100%)", dim: "width" },
  right:  { translateIn: "translateX(0)",   translateOut: "translateX(100%)",  dim: "width" },
  top:    { translateIn: "translateY(0)",   translateOut: "translateY(-100%)", dim: "height" },
  bottom: { translateIn: "translateY(0)",   translateOut: "translateY(100%)",  dim: "height" },
};

// --- Main Class ---

export class SideSheetManager {
  create(options: SheetOptions): SheetInstance {
    const opts = {
      side: options.side ?? "right",
      size: options.size ?? "md",
      closable: options.closable ?? true,
      showOverlay: options.showOverlay ?? true,
      closeOnOverlayClick: options.closeOnOverlayClick ?? true,
      animationDuration: options.animationDuration ?? 280,
      easing: options.easing ?? "cubic-bezier(0.4, 0, 0.2, 1)",
      resizable: options.resizable ?? false,
      parent: options.parent ?? document.body,
      className: options.className ?? "",
      ...options,
    };

    const parent = typeof opts.parent === "string"
      ? document.querySelector<HTMLElement>(opts.parent)!
      : opts.parent;

    if (!parent) throw new Error("SideSheet: parent not found");

    let destroyed = false;
    let isOpen = false;
    const sp = SIDE_PROPS[opts.side];
    const isHorizontal = opts.side === "left" || opts.side === "right";

    // Overlay
    let overlay: HTMLDivElement | null = null;
    if (opts.showOverlay) {
      overlay = document.createElement("div");
      overlay.className = "sheet-overlay";
      overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9998;
        opacity:0;pointer-events:none;transition:opacity ${opts.animationDuration}ms ${opts.easing};
      `;
      if (opts.closeOnOverlayClick) {
        overlay.addEventListener("click", () => instance.close());
      }
      // Don't append yet — add when opening
    }

    // Sheet panel
    const sheet = document.createElement("div");
    sheet.className = `side-sheet sheet-${opts.side} sheet-${opts.size} ${opts.className}`;
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.style.cssText = `
      position:fixed;z-index:9999;
      ${isHorizontal
        ? `top:0;bottom:0;${opts.side}:0;width:${opts.width ?? SIZE_MAP[opts.side][opts.size]};`
        : `left:0;right:0;${opts.side}:0;height:${opts.height ?? SIZE_MAP[opts.side][opts.size]};`}
      background:#fff;box-shadow:${isHorizontal ? "-4" : "0"}px 0 ${isHorizontal ? "" : "-"}px 24px rgba(0,0,0,0.15);
      display:flex;flex-direction:column;
      transform:${sp.translateOut};transition:transform ${opts.animationDuration}ms ${opts.easing};
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
    `;

    // Resize handle
    let resizeHandle: HTMLDivElement | null = null;
    if (opts.resizable) {
      resizeHandle = document.createElement("div");
      resizeHandle.className = "sheet-resize-handle";
      const handlePos = isHorizontal
        ? (opts.side === "right" ? "left:0;top:0;bottom:0;width:4px;" : "right:0;top:0;bottom:0;width:4px;")
        : (opts.side === "bottom" ? "top:0;left:0;right:0;height:4px;" : "bottom:0;left:0;right:0;height:4px;");
      resizeHandle.style.cssText = `
        position:absolute;${handlePos}
        cursor:${isHorizontal ? "col-resize" : "row-resize"};
        background:transparent;z-index:10;
        &:hover{background:#6366f1;}
      `;
      setupResize(resizeHandle);
      sheet.appendChild(resizeHandle);
    }

    // Header area
    const headerEl = document.createElement("div");
    headerEl.className = "sheet-header";
    headerEl.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;gap:12px;
      padding:16px 20px;border-bottom:1px solid #f0f0f0;flex-shrink:0;
    `;
    sheet.appendChild(headerEl);

    // Title
    const titleEl = document.createElement("div");
    titleEl.className = "sheet-title";
    titleEl.style.cssText = "font-size:16px;font-weight:600;color:#111827;flex:1;min-width:0;";
    if (opts.title) titleEl.textContent = opts.title;
    else if (opts.header) {
      if (typeof opts.header === "string") titleEl.textContent = opts.header;
      else titleEl.appendChild(opts.header);
    }
    headerEl.appendChild(titleEl);

    // Close button
    if (opts.closable) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.innerHTML = "&times;";
      closeBtn.style.cssText = `
        width:32px;height:32px;border-radius:6px;border:none;background:none;
        color:#6b7280;font-size:20px;cursor:pointer;display:flex;
        align-items:center;justify-content:center;flex-shrink:0;
        transition:background 0.15s,color 0.15s;
      `;
      closeBtn.addEventListener("click", () => instance.close());
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#f3f4f6"; closeBtn.style.color = "#111827"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; closeBtn.style.color = "#6b7280"; });
      headerEl.appendChild(closeBtn);
    }

    // Body area
    const bodyEl = document.createElement("div");
    bodyEl.className = "sheet-body";
    bodyEl.style.cssText = "flex:1;overflow-y:auto;padding:16px 20px;";
    if (opts.body) {
      if (typeof opts.body === "string") bodyEl.innerHTML = opts.body;
      else bodyEl.appendChild(opts.body);
    }
    sheet.appendChild(bodyEl);

    // Footer area
    if (opts.footer) {
      const footerEl = document.createElement("div");
      footerEl.className = "sheet-footer";
      footerEl.style.cssText = `
        display:flex;align-items:center;justify-content:flex-end;gap:10px;
        padding:12px 20px;border-top:1px solid #f0f0f0;flex-shrink:0;
      `;
      if (typeof opts.footer === "string") footerEl.innerHTML = opts.footer;
      else footerEl.appendChild(opts.footer);
      sheet.appendChild(footerEl);
    }

    // Keyboard: Escape to close
    function handleKeydown(e: KeyboardEvent): void {
      if (e.key === "Escape" && isOpen && !destroyed) {
        instance.close();
      }
    }
    document.addEventListener("keydown", handleKeydown);

    // Lock body scroll when open
    function lockScroll(): void {
      document.body.style.overflow = "hidden";
    }
    function unlockScroll(): void {
      document.body.style.overflow = "";
    }

    // Resize logic
    function setupResize(handle: HTMLDivElement): void {
      let startX = 0;
      let startY = 0;
      let startSize = 0;

      handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        startSize = isHorizontal ? sheet.offsetWidth : sheet.offsetHeight;

        const onMove = (ev: MouseEvent) => {
          const delta = isHorizontal
            ? (opts.side === "right" ? startSize - (ev.clientX - startX) : startSize + (ev.clientX - startX))
            : (opts.side === "bottom" ? startSize - (ev.clientY - startY) : startSize + (ev.clientY - startY));
          const newSize = Math.max(200, delta);
          if (isHorizontal) sheet.style.width = `${newSize}px`;
          else sheet.style.height = `${newSize}px`;
        };

        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    }

    // Instance
    const instance: SheetInstance = {
      element: sheet,
      overlay,

      isOpen() { return isOpen; },

      open(): void {
        if (isOpen || destroyed) return;
        isOpen = true;
        if (overlay) {
          parent.appendChild(overlay);
          requestAnimationFrame(() => { overlay!.style.opacity = "1"; overlay!.style.pointerEvents = "auto"; });
        }
        parent.appendChild(sheet);
        requestAnimationFrame(() => {
          sheet.style.transform = sp.translateIn;
        });
        lockScroll();
        opts.onOpen?.();
      },

      close(): void {
        if (!isOpen || destroyed) return;
        isOpen = false;
        sheet.style.transform = sp.translateOut;
        if (overlay) {
          overlay.style.opacity = "0";
          overlay.style.pointerEvents = "none";
        }
        setTimeout(() => {
          sheet.remove();
          if (overlay) overlay.remove();
          unlockScroll();
          opts.onClose?.();
        }, opts.animationDuration);
      },

      toggle(): void {
        isOpen ? instance.close() : instance.open();
      },

      setBody(content: string | HTMLElement): void {
        bodyEl.innerHTML = "";
        if (typeof content === "string") bodyEl.innerHTML = content;
        else bodyEl.appendChild(content);
      },

      setTitle(title: string): void {
        titleEl.textContent = title;
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;
        document.removeEventListener("keydown", handleKeydown);
        unlockScroll();
        sheet.remove();
        if (overlay) overlay.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a side sheet */
export function createSideSheet(options: SheetOptions): SheetInstance {
  return new SideSheetManager().create(options);
}
