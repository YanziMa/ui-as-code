/**
 * Bottom Sheet: Slide-up panel from bottom of screen with drag handle,
 * backdrop dismiss, snap points, multiple sizes (peek/half/full), safe area support,
 * and keyboard-avoiding behavior.
 */

// --- Types ---

export type SheetSize = "peek" | "half" | "full" | "auto" | number;
export type SnapPoint = number; // 0-1 where 0=closed, 0.5=half, 1=full

export interface BottomSheetOptions {
  /** Content: HTML string or element */
  content: string | HTMLElement;
  /** Title (shown in header) */
  title?: string;
  /** Initial size/height */
  size?: SheetSize;
  /** Snap points the sheet can settle at (0 to 1) */
  snapPoints?: SnapPoint[];
  /** Initial snap point (index into snapPoints) */
  initialSnap?: number;
  /** Show drag handle? */
  showHandle?: boolean;
  /** Close on backdrop click? */
  closeOnBackdrop?: boolean;
  /** Close on Escape key? */
  closeOnEscape?: boolean;
  /** Z-index */
  zIndex?: number;
  /** Animation duration ms (default: 300) */
  animationDuration?: number;
  /** Border radius (default: 16px top corners) */
  borderRadius?: number;
  /** Background color */
  background?: string;
  /** Callback when opened */
  onOpen?: () => void;
  /** Callback when closed */
  onClose?: () => void;
  /** Callback on snap change */
  onSnapChange?: (snap: number) => void;
  /** Callback on height change during drag */
  onDrag?: (height: number) => void;
  /** Container element (default: document.body) */
  container?: HTMLElement;
  /** Custom CSS class */
  className?: string;
}

export interface BottomSheetInstance {
  element: HTMLDivElement;
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
  snapTo: (snapIndex: number) => void;
  setSize: (size: SheetSize) => void;
  setContent: (content: string | HTMLElement) => void;
  destroy: () => void;
}

// --- Size Helpers ---

function getSizeValue(size: SheetSize, viewportH: number): number {
  if (typeof size === "number") return size;
  switch (size) {
    case "peek": return Math.min(300, viewportH * 0.4);
    case "half": return viewportH * 0.5;
    case "full": return viewportH - 20;
    case "auto": return viewportH * 0.7;
    default: return viewportH * 0.5;
  }
}

// --- Main Factory ---

export function createBottomSheet(options: BottomSheetOptions): BottomSheetInstance {
  const opts = {
    size: options.size ?? "half",
    snapPoints: options.snapPoints ?? [0, 0.5, 1],
    initialSnap: options.initialSnap ?? 1,
    showHandle: options.showHandle ?? true,
    closeOnBackdrop: options.closeOnBackdrop ?? true,
    closeOnEscape: options.closeOnEscape ?? true,
    zIndex: options.zIndex ?? 10500,
    animationDuration: options.animationDuration ?? 300,
    borderRadius: options.borderRadius ?? 16,
    background: options.background ?? "#fff",
    container: options.container ?? document.body,
    className: options.className ?? "",
    ...options,
  };

  const container = opts.container;

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "bs-backdrop";
  backdrop.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.4);
    z-index:${opts.zIndex};display:none;transition:opacity ${opts.animationDuration}ms ease;
    opacity:0;pointer-events:none;
  `;
  container.appendChild(backdrop);

  // Sheet
  const sheet = document.createElement("div");
  sheet.className = `bottom-sheet ${opts.className}`;
  sheet.style.cssText = `
    position:fixed;left:0;right:0;bottom:0;z-index:${opts.zIndex + 1};
    background:${opts.background};
    border-radius:${opts.borderRadius}px ${opts.borderRadius}px 0 0;
    transform:translateY(100%);opacity:0;
    transition:transform ${opts.animationDuration}ms cubic-bezier(0.32,0.72,0,1),
                opacity ${opts.animationDuration}ms ease;
    pointer-events:none;overflow:hidden;
    max-height:100vh;padding-bottom:env(safe-area-inset-bottom, 0);
    box-shadow:0 -4px 24px rgba(0,0,0,0.15);
  `;
  container.appendChild(sheet);

  let isOpenState = false;
  let destroyed = false;
  let currentHeight = 0;
  let isDragging = false;
  let dragStartY = 0;
  let dragStartHeight = 0;

  // Handle bar
  const handleBar = document.createElement("div");
  if (opts.showHandle) {
    handleBar.style.cssText = `
      width:36px;height:5px;border-radius:3px;background:#d1d5db;margin:8px auto;
      cursor:grab;flex-shrink:0;
    `;
    sheet.appendChild(handleBar);
  }

  // Header
  const headerEl = document.createElement("div");
  headerEl.style.cssText = `
    display:flex;align-items:center;justify-content:space-between;
    padding:12px 16px;border-bottom:1px solid #f0f0f0;flex-shrink:0;
  `;

  if (opts.title) {
    const titleSpan = document.createElement("span");
    titleSpan.textContent = opts.title;
    titleSpan.style.cssText = "font-size:16px;font-weight:600;color:#111827;";
    headerEl.appendChild(titleSpan);
  }

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.innerHTML = "&times;";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.style.cssText = `
    background:none;border:none;cursor:pointer;font-size:18px;color:#9ca3af;
    padding:4px 6px;border-radius:4px;transition:all 0.15s;
  `;
  closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#f3f4f6"; });
  closeBtn.addEventListener("mouseleave", () => { closeBtn.background = ""; });
  closeBtn.addEventListener("click", () => instance.close());
  headerEl.appendChild(closeBtn);
  sheet.appendChild(headerEl);

  // Content area
  const contentArea = document.createElement("div");
  contentArea.className = "bs-content";
  contentArea.style.cssText = `
    overflow-y:auto;flex:1;padding:0 16px 16px;
    overscroll-behavior:contain;-webkit-overflow-scrolling:touch;
  `;

  function renderContent(): void {
    contentArea.innerHTML = "";
    if (typeof opts.content === "string") {
      contentArea.innerHTML = opts.content;
    } else {
      contentArea.appendChild(opts.content);
    }
  }

  // Drag to resize
  if (handleBar) {
    handleBar.addEventListener("pointerdown", (e: PointerEvent) => {
      isDragging = true;
      dragStartY = e.clientY;
      dragStartHeight = currentHeight || sheet.offsetHeight;
      handleBar.setPointerCapture(e.pointerId);
      handleBar.style.cursor = "grabbing";
      sheet.style.transition = "none";

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    });
  }

  function onPointerMove(e: PointerEvent): void {
    if (!isDragging) return;
    const delta = dragStartY - e.clientY;
    const vh = window.innerHeight;
    const newHeight = Math.max(80, Math.min(vh - 40, dragStartHeight + delta));
    currentHeight = newHeight;

    sheet.style.height = `${newHeight}px`;
    opts.onDrag?.(newHeight);
  }

  function onPointerUp(): void {
    if (!isDragging) return;
    isDragging = false;
    handleBar.style.cursor = "grab";
    sheet.style.transition = "";

    // Snap to nearest point
    const vh = window.innerHeight;
    const pct = currentHeight / vh;
    const snaps = opts.snapPoints;
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < snaps.length; i++) {
      const dist = Math.abs(snaps[i]! - pct);
      if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
    }

    snapTo(nearestIdx);
  }

  function open(): void {
    if (isOpenState || destroyed) return;
    isOpenState = true;

    renderContent();

    backdrop.style.display = "block";
    requestAnimationFrame(() => { backdrop.style.opacity = "1"; });

    sheet.style.pointerEvents = "auto";
    const targetHeight = getSizeValue(opts.size, window.innerHeight);
    currentHeight = targetHeight;
    sheet.style.height = `${targetHeight}px`;

    requestAnimationFrame(() => {
      sheet.style.transform = "translateY(0)";
      sheet.style.opacity = "1";
    });

    opts.onOpen?.();
  }

  function close(): void {
    if (!isOpenState || destroyed) return;
    isOpenState = false;

    sheet.style.transform = "translateY(100%)";
    sheet.style.opacity = "0";
    sheet.style.pointerEvents = "none";

    backdrop.style.opacity = "0";
    setTimeout(() => { backdrop.style.display = "none"; }, opts.animationDuration);

    opts.onClose?.();
  }

  function snapTo(snapIndex: number): void {
    const snap = opts.snapPoints[snapIndex];
    if (snap == null) return;

    const vh = window.innerHeight;
    const targetH = snap === 0 ? 0 : snap === 1 ? vh - 20 : vh * snap;
    currentHeight = targetH;
    sheet.style.height = `${targetH}px`;

    if (snap === 0) {
      close();
    } else {
      sheet.style.transform = "translateY(0)";
      sheet.style.opacity = "1";
    }

    opts.onSnapChange?.(snap);
  }

  // Backdrop click
  backdrop.addEventListener("click", () => {
    if (opts.closeOnBackdrop) close();
  });

  // Escape key
  if (opts.closeOnEscape) {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpenState) { e.preventDefault(); close(); }
    };
    document.addEventListener("keydown", escHandler);
    (sheet as any)._escHandler = escHandler;
  }

  const instance: BottomSheetInstance = {
    element: sheet,

    isOpen: () => isOpenState,

    open,

    close,

    snapTo,

    setSize(size: SheetSize) {
      const h = getSizeValue(size, window.innerHeight);
      currentHeight = h;
      sheet.style.height = `${h}px`;
    },

    setContent(content: string | HTMLElement) {
      opts.content = content;
      renderContent();
    },

    destroy() {
      destroyed = true;
      close();
      backdrop.remove();
      sheet.remove();
      const escH = (sheet as any)._escHandler;
      if (escH) document.removeEventListener("keydown", escH);
    },
  };

  return instance;
}
